package main

import (
	"crypto/tls"
	"log"
	"net/http"

	"homepage/internal/api"
	"homepage/internal/downloader"
	"homepage/internal/service"
)

func main() {
	engine := downloader.NewAria2()
	svc := service.NewDownloadManager(engine)
	handlers := api.NewHandlers(svc)

	http.HandleFunc("/api/downloads", handlers.HandleDownloadsAPI)
	http.HandleFunc("/api/downloads/metadata", handlers.HandleMetadataAPI)

	// Serve the public folder
	fs := http.FileServer(http.Dir("public"))
	http.Handle("/", fs)

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
