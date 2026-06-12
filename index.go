package main

import (
	"crypto/tls"
	"log"
	"net/http"
)

func main() {
	// Serve current directory (like SimpleHTTPRequestHandler)
	fs := http.FileServer(http.Dir("."))

	http.Handle("/", fs)

	// Load TLS certificate
	certFile := "certificates/cert.pem"
	keyFile := "certificates/key.pem"

	server := &http.Server{
		Addr: ":8088",
		TLSConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
	}

	log.Println("Serving at https://localhost:8088")

	err := server.ListenAndServeTLS(certFile, keyFile)
	if err != nil {
		log.Fatal(err)
	}
}