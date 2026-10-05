# Serveur local SANS CACHE (13/09) : chaque recharge sert toujours la dernière
# version des fichiers — fini les vieux index.html fantômes en dev.
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()
ThreadingHTTPServer(('', 8101), H).serve_forever()
