#!/usr/bin/env python3
"""Construit la version « en ligne » de Power Up dans dist/ :
- les scripts de index.html réunis en deux fichiers minifiés : power-up.min.js (données + i18n.js) puis app.min.js
  (deux fichiers pour que les dictionnaires anglais, chargés seulement en EN, passent avant app.js),
- dictionnaires anglais js/i18n/*.js minifiés,
- feuille de style minifiée,
- seuls les sons réellement joués sur le site public.
Nécessite esbuild (chemin dans la variable ESBUILD, sinon « esbuild » dans le PATH)."""
import json, os, re, shutil, subprocess, sys, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
ESB = os.environ.get("ESBUILD", "esbuild")
SONS_PUBLICS = ["Bell.mp3", "aura-survol.mp3"]

html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
scripts = re.findall(r'<script src="([^"]+)"></script>', html)
shutil.rmtree(DIST, ignore_errors=True); os.makedirs(os.path.join(DIST, "js")); os.makedirs(os.path.join(DIST, "css")); os.makedirs(os.path.join(DIST, "sons"))
app_js = [x for x in scripts if x.endswith("app.js")]
data_js = [x for x in scripts if not x.endswith("app.js")]
def pack(files, name):
    tmp = os.path.join(DIST, "js", "_tmp.js")
    open(tmp, "w", encoding="utf-8").write(";\n".join(open(os.path.join(ROOT, f), encoding="utf-8").read() for f in files))
    subprocess.run([ESB, tmp, "--minify", "--target=es2018", "--charset=utf8", "--outfile=" + os.path.join(DIST, "js", name)], check=True)
    os.remove(tmp)
pack(data_js, "power-up.min.js")
pack(app_js, "app.min.js")
os.makedirs(os.path.join(DIST, "js", "i18n"))
for f in sorted(os.listdir(os.path.join(ROOT, "js", "i18n"))):
    if f.endswith(".js"):
        subprocess.run([ESB, os.path.join(ROOT, "js", "i18n", f), "--minify", "--target=es2018", "--charset=utf8", "--outfile=" + os.path.join(DIST, "js", "i18n", f)], check=True)
subprocess.run([ESB, os.path.join(ROOT, "css", "style.css"), "--minify", "--charset=utf8", "--outfile=" + os.path.join(DIST, "css", "style.min.css")], check=True)
shutil.copytree(os.path.join(ROOT, "css", "fonts"), os.path.join(DIST, "css", "fonts"))  # polices hébergées (OFL)
if os.path.exists(os.path.join(ROOT, "_headers")): shutil.copy(os.path.join(ROOT, "_headers"), os.path.join(DIST, "_headers"))  # en-têtes de sécurité (Cloudflare Pages)
first = True
def sub(m):
    global first
    src = m.group(1)
    if src.endswith("app.js"): return '<script src="js/app.min.js"></script>'
    if first:
        first = False; return '<script src="js/power-up.min.js"></script>'
    return ""
out = re.sub(r'<script src="([^"]+)"></script>\n?', sub, html).replace('href="css/style.css"', 'href="css/style.min.css"')
open(os.path.join(DIST, "index.html"), "w", encoding="utf-8").write(out)
for s in SONS_PUBLICS: shutil.copy(os.path.join(ROOT, "sons", s), os.path.join(DIST, "sons", s))
if os.path.exists(os.path.join(ROOT, "apercu.jpg")): shutil.copy(os.path.join(ROOT, "apercu.jpg"), os.path.join(DIST, "apercu.jpg"))  # image d'aperçu du lien (Open Graph)
# --- mode hors ligne : manifeste, icônes et service worker (la liste des fichiers à mémoriser est générée ici) ---
for f in ("manifest.webmanifest",):
    if os.path.exists(os.path.join(ROOT, f)): shutil.copy(os.path.join(ROOT, f), os.path.join(DIST, f))
for f in ("icon-192.png", "icon-512.png", "icon-maskable-512.png"):
    if os.path.exists(os.path.join(ROOT, f)): shutil.copy(os.path.join(ROOT, f), os.path.join(DIST, f))
if os.path.exists(os.path.join(ROOT, "sw.js")):
    cache = ["./"]
    for base, _, names in os.walk(DIST):
        for n in names:
            rel = os.path.relpath(os.path.join(base, n), DIST).replace(os.sep, "/")
            if rel not in ("_headers", "sw.js"): cache.append(rel)
    sw = open(os.path.join(ROOT, "sw.js"), encoding="utf-8").read().replace("__BUILD__", time.strftime("%Y%m%d%H%M%S")).replace("__FILES__", json.dumps(sorted(cache)))
    open(os.path.join(DIST, "sw.js"), "w", encoding="utf-8").write(sw)
print("dist/ prêt :", len(scripts), "scripts réunis en 2 (+ dictionnaires anglais dans js/i18n/)")
