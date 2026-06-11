from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

server = HTTPServer(('localhost', 8088), SimpleHTTPRequestHandler)

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('certificates/cert.pem', 'certificates/key.pem')

server.socket = context.wrap_socket(
    server.socket,
    server_side=True
)

print("Serving at https://localhost:8088")
server.serve_forever()
