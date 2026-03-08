package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

func New(target *url.URL, stripPrefix string) *httputil.ReverseProxy {
	director := func(r *http.Request) {
		r.URL.Scheme = target.Scheme
		r.URL.Host = target.Host
		if stripPrefix != "" && strings.HasPrefix(r.URL.Path, stripPrefix) {
			r.URL.Path = strings.TrimPrefix(r.URL.Path, stripPrefix)
			if r.URL.Path == "" {
				r.URL.Path = "/"
			}
		}
		r.URL.RawPath = r.URL.EscapedPath()
		r.Host = target.Host
	}
	return &httputil.ReverseProxy{
		Director: director,
		ModifyResponse: func(resp *http.Response) error {
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("proxy error %s %s: %v", r.Method, r.URL.Path, err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			w.Write([]byte(`{"error":"bad gateway"}`))
		},
	}
}

func LoggingMiddleware(next *httputil.ReverseProxy, upstream string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wr := &responseWriter{ResponseWriter: w, status: 200}
		next.ServeHTTP(wr, r)
		log.Printf("%s %s -> %s %d %v", r.Method, r.URL.Path, upstream, wr.status, time.Since(start))
	})
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (w *responseWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}
