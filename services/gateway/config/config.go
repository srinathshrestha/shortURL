package config

import "os"

type Config struct {
	Port             string
	JWTSecret        string
	RedisAddr        string
	AuthServiceURL   string
	LinkServiceURL   string
	ReportServiceURL string
}

func Load() Config {
	c := Config{
		Port:             getEnv("PORT", "8080"),
		JWTSecret:        os.Getenv("JWT_SECRET"),
		RedisAddr:        getEnv("REDIS_ADDR", "redis:6379"),
		AuthServiceURL:   getEnv("AUTH_SERVICE_URL", "http://auth-service:8081"),
		LinkServiceURL:   getEnv("LINK_SERVICE_URL", "http://link-service:8082"),
		ReportServiceURL: getEnv("REPORT_SERVICE_URL", "http://report-service:8084"),
	}
	if c.JWTSecret == "" {
		panic("JWT_SECRET is required")
	}
	return c
}

func getEnv(k, defaultVal string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return defaultVal
}
