package main

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"os/signal"
	"syscall"
	"time"

	"linkverse/gateway/config"
	"linkverse/gateway/middleware"
	"linkverse/gateway/proxy"

	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := config.Load()
	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	defer rdb.Close()
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("redis ping: %v", err)
	}
	authURL, _ := url.Parse(cfg.AuthServiceURL)
	linkURL, _ := url.Parse(cfg.LinkServiceURL)
	reportURL, _ := url.Parse(cfg.ReportServiceURL)

	authProxy := proxy.New(authURL, "/api")
	linkProxy := proxy.New(linkURL, "/api")
	reportProxy := proxy.New(reportURL, "/api")
	redirectProxy := proxy.New(linkURL, "")

	authHandler := proxy.LoggingMiddleware(authProxy, cfg.AuthServiceURL)
	linkHandler := proxy.LoggingMiddleware(linkProxy, cfg.LinkServiceURL)
	reportHandler := proxy.LoggingMiddleware(reportProxy, cfg.ReportServiceURL)
	redirectHandler := proxy.LoggingMiddleware(redirectProxy, cfg.LinkServiceURL)

	jwt := middleware.JWTMiddleware(cfg.JWTSecret)
	rateLimit := middleware.RateLimitMiddleware(rdb, 100)

	mux := http.NewServeMux()
	mux.Handle("/api/auth/register", rateLimit(authHandler))
	mux.Handle("/api/auth/login", rateLimit(authHandler))
	mux.Handle("/api/links", jwt(rateLimit(linkHandler)))
	mux.Handle("/api/links/", jwt(rateLimit(linkHandler)))
	mux.Handle("/api/reports/", jwt(rateLimit(reportHandler)))
	mux.Handle("/r/", rateLimit(redirectHandler))

	srv := &http.Server{Addr: ":" + cfg.Port, Handler: mux}
	go func() {
		log.Printf("gateway listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("ListenAndServe: %v", err)
		}
	}()
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	<-ctx.Done()
	stop()
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdown); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
