// Placeholder until 05-link-service.md
package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	port := "8082"
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}
	log.Printf("Link placeholder listening on :%s", port)
	http.ListenAndServe(":"+port, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte("Link service not implemented yet"))
	}))
}
