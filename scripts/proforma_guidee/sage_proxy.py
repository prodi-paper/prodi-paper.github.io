# Proxy LOCAL (127.0.0.1:8102) pour direct.html : lecture Sage sans login, clé service jamais envoyée au navigateur.
# Tables autorisées en GET seulement.
import http.server, urllib.request, os, re
KEY=[l.split('=',1)[1].strip() for l in open(os.path.expanduser('~/.supabase_prodi.env')) if l.startswith('SUPABASE_SERVICE_ROLE=')][0]
URL='https://bvcgpdoukhcatjibmvnb.supabase.co/rest/v1/'
OK=re.compile(r'^/(sage_clients|sage_ventes|sage_vente_lignes|sage_banques_clients|rpc/sage_recherche_clients|rpc/sage_pays_client)\?')
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        ip=self.client_address[0]
        # test iPhone : réseau local seulement (Mac + appareils du Wi-Fi), lecture des tables Sage listées
        if not (ip.startswith('127.') or ip.startswith('192.168.') or ip.startswith('10.') or ip=='::1'):
            self.send_response(403); self.end_headers(); return
        if not OK.match(self.path): self.send_response(403); self.end_headers(); return
        req=urllib.request.Request(URL+self.path[1:],headers={'apikey':KEY,'Authorization':'Bearer '+KEY})
        try: body=urllib.request.urlopen(req,timeout=20).read(); code=200
        except urllib.error.HTTPError as e: body=e.read(); code=e.code
        self.send_response(code); self.send_header('Content-Type','application/json')
        o=self.headers.get('Origin','');self.send_header('Access-Control-Allow-Origin',o if re.match(r'^http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):8101$',o) else 'http://localhost:8101'); self.end_headers(); self.wfile.write(body)
    def log_message(self,*a): pass
http.server.ThreadingHTTPServer(('0.0.0.0',8102),H).serve_forever()
