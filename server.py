from http.server import HTTPServer, SimpleHTTPRequestHandler; import sys; s=('',4000); h=HTTPServer(s,SimpleHTTPRequestHandler); print('Server running at http://localhost:4000'); h.serve_forever()
