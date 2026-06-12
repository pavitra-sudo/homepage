package main

import (
	"crypto/tls"
	"flag"
	"log"
	"net/http"

	"homepage/internal/api"
	"homepage/internal/downloader"
	"homepage/internal/service"
)

func main() {
	port := flag.String("port", "8088", "Port to run the server on")
	flag.Parse()

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
		Addr: ":" + *port,
		TLSConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
	}

	log.Printf("Serving at https://localhost:%s\n", *port)

	err := server.ListenAndServeTLS(certFile, keyFile)
	if err != nil {
		log.Fatal(err)
	}
}
