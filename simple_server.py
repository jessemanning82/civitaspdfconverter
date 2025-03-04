from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys

class CustomHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        return SimpleHTTPRequestHandler.do_GET(self)

def run(port=4000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, CustomHandler)
    print(f"Server running at http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.socket.close()

if __name__ == '__main__':
    run() 