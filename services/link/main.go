package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// ── Config ────────────────────────────────────────────────────────────────────

type App struct {
	pool         *pgxpool.Pool
	rdb          *redis.Client
	jwtSecret    string
	analyticsURL string
}

// ── Models ────────────────────────────────────────────────────────────────────

type Link struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Slug      string    `json:"slug"`
	LongURL   string    `json:"long_url"`
	Title     *string   `json:"title"`
	CreatedAt time.Time `json:"created_at"`
}

type ClickEvent struct {
	Slug      string    `json:"slug"`
	IP        string    `json:"ip"`
	Referrer  string    `json:"referrer"`
	UA        string    `json:"user_agent"`
	Timestamp time.Time `json:"timestamp"`
}

// ── JWT ───────────────────────────────────────────────────────────────────────

// extractUserID reads the JWT from Authorization header and returns the user_id claim.
// func (a *App) extractUserID(r *http.Request) (string, error) {
// 	authHeader := r.Header.Get("Authorization")
// 	if authHeader == "" {
// 		return "", fmt.Errorf("missing authorization header")
// 	}
// 	parts := strings.SplitN(authHeader, " ", 2)
// 	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
// 		return "", fmt.Errorf("invalid authorization format")
// 	}
// 	tokenStr := parts[1]
// 	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
// 		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
// 			return nil, fmt.Errorf("unexpected signing method")
// 		}
// 		return []byte(a.jwtSecret), nil
// 	})
// 	if err != nil || !token.Valid {
// 		return "", fmt.Errorf("invalid token: %w", err)
// 	}
// 	claims, ok := token.Claims.(jwt.MapClaims)
// 	if !ok {
// 		return "", fmt.Errorf("invalid claims")
// 	}
// 	userID, ok := claims["user_id"].(string)
// 	if !ok || userID == "" {
// 		return "", fmt.Errorf("user_id missing from token")
// 	}
// 	return userID, nil
// }
// extractUserID reads the user ID injected by the Gateway's JWT middleware.
func (a *App) extractUserID(r *http.Request) (string, error) {
    userID := r.Header.Get("X-User-ID")
    if userID == "" {
        return "", fmt.Errorf("missing X-User-ID header from gateway")
    }
    return userID, nil
}

// ── Slug generation ───────────────────────────────────────────────────────────

func generateSlug() (string, error) {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	slug := base64.URLEncoding.EncodeToString(b)
	// strip padding, keep 8 url-safe chars
	slug = strings.TrimRight(slug, "=")
	if len(slug) > 8 {
		slug = slug[:8]
	}
	return slug, nil
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// GET /api/links — list links belonging to the authenticated user
func (a *App) handleListLinks(w http.ResponseWriter, r *http.Request) {
	userID, err := a.extractUserID(r)
	if err != nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := a.pool.Query(r.Context(),
		`SELECT id, user_id, slug, long_url, title, created_at
		 FROM links WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		log.Printf("listLinks query: %v", err)
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	links := []Link{}
	for rows.Next() {
		var l Link
		if err := rows.Scan(&l.ID, &l.UserID, &l.Slug, &l.LongURL, &l.Title, &l.CreatedAt); err != nil {
			log.Printf("listLinks scan: %v", err)
			continue
		}
		links = append(links, l)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"links": links})
}

// POST /api/links — create a new short link
func (a *App) handleCreateLink(w http.ResponseWriter, r *http.Request) {
	userID, err := a.extractUserID(r)
	if err != nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var body struct {
		LongURL string  `json:"long_url"`
		Title   *string `json:"title"`
		Slug    string  `json:"slug"` // optional custom slug
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.LongURL == "" {
		http.Error(w, `{"error":"long_url required"}`, http.StatusBadRequest)
		return
	}

	slug := body.Slug
	if slug == "" {
		slug, err = generateSlug()
		if err != nil {
			http.Error(w, `{"error":"slug generation failed"}`, http.StatusInternalServerError)
			return
		}
	}

	var link Link
	err = a.pool.QueryRow(r.Context(),
		`INSERT INTO links (user_id, slug, long_url, title)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, slug, long_url, title, created_at`,
		userID, slug, body.LongURL, body.Title,
	).Scan(&link.ID, &link.UserID, &link.Slug, &link.LongURL, &link.Title, &link.CreatedAt)
	if err != nil {
		log.Printf("createLink insert: %v", err)
		if strings.Contains(err.Error(), "unique") {
			http.Error(w, `{"error":"slug already taken"}`, http.StatusConflict)
			return
		}
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}

	// Cache slug → long_url in Redis (24h TTL)
	a.rdb.Set(r.Context(), "slug:"+slug, body.LongURL, 24*time.Hour)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(link)
}

// DELETE /api/links/{id} — delete a link owned by the authenticated user
func (a *App) handleDeleteLink(w http.ResponseWriter, r *http.Request) {
	userID, err := a.extractUserID(r)
	if err != nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Extract id from path: /api/links/{id}
	id := strings.TrimPrefix(r.URL.Path, "/links/")
	if id == "" {
		http.Error(w, `{"error":"missing id"}`, http.StatusBadRequest)
		return
	}

	var slug string
	err = a.pool.QueryRow(r.Context(),
		`DELETE FROM links WHERE id = $1 AND user_id = $2 RETURNING slug`,
		id, userID,
	).Scan(&slug)
	if err != nil {
		http.Error(w, `{"error":"not found or not yours"}`, http.StatusNotFound)
		return
	}

	// Evict from Redis
	a.rdb.Del(r.Context(), "slug:"+slug)

	w.WriteHeader(http.StatusNoContent)
}

// GET /r/{slug} — redirect handler (public, no auth)
func (a *App) handleRedirect(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimPrefix(r.URL.Path, "/r/")
	if slug == "" {
		http.NotFound(w, r)
		return
	}

	ctx := r.Context()

	// 1. Try Redis first (fast path)
	longURL, err := a.rdb.Get(ctx, "slug:"+slug).Result()
	if err != nil {
		// 2. Fall back to PostgreSQL
		err = a.pool.QueryRow(ctx,
			`SELECT long_url FROM links WHERE slug = $1`, slug,
		).Scan(&longURL)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		// Backfill Redis
		a.rdb.Set(ctx, "slug:"+slug, longURL, 24*time.Hour)
	}

	// 3. Fire click event to analytics async (don't block redirect)
	go a.fireClickEvent(slug, r)

	// 4. Redirect immediately
	http.Redirect(w, r, longURL, http.StatusFound)
}

// fireClickEvent sends click data to the analytics service in the background.
func (a *App) fireClickEvent(slug string, r *http.Request) {
	if a.analyticsURL == "" {
		return
	}
	event := ClickEvent{
		Slug:      slug,
		IP:        realIP(r),
		Referrer:  r.Referer(),
		UA:        r.UserAgent(),
		Timestamp: time.Now().UTC(),
	}
	body, err := json.Marshal(event)
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		a.analyticsURL+"/events", bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("analytics ingest error: %v", err)
		return
	}
	resp.Body.Close()
}

func realIP(r *http.Request) string {
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return strings.Split(ip, ",")[0]
	}
	return r.RemoteAddr
}

// GET /health
func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

// ── Router ────────────────────────────────────────────────────────────────────

func (a *App) routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", handleHealth)

	// Redirect (public)
	mux.HandleFunc("/r/", a.handleRedirect)

	// Link CRUD (authenticated)
	mux.HandleFunc("/links", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			a.handleListLinks(w, r)
		case http.MethodPost:
			a.handleCreateLink(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/links/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodDelete:
			a.handleDeleteLink(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	return mux
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		log.Fatal("POSTGRES_DSN required")
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET required")
	}
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "redis:6379"
	}
	analyticsURL := os.Getenv("ANALYTICS_SERVICE_URL")

	// Postgres
	var pool *pgxpool.Pool
	var err error
	for i := 0; i < 10; i++ {
		pool, err = pgxpool.New(context.Background(), dsn)
		if err == nil {
			if err = pool.Ping(context.Background()); err == nil {
				break
			}
		}
		log.Printf("db not ready, retrying (%d/10)...", i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}
	defer pool.Close()

	// Redis
	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("redis connect failed: %v", err)
	}
	defer rdb.Close()

	app := &App{
		pool:         pool,
		rdb:          rdb,
		jwtSecret:    jwtSecret,
		analyticsURL: analyticsURL,
	}

	srv := &http.Server{
		Addr:         ":8082",
		Handler:      app.routes(),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Println("link-service listening on :8082")
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("listen: %v", err)
	}
}