# Serveur local pour tester Power Up (Lighthouse, etc.)
# Écoute uniquement sur 127.0.0.1 : seul cet ordinateur peut ouvrir le site.
# Lancement : depuis le dossier du site, exécuter
#   powershell -ExecutionPolicy Bypass -File .\outils\serveur-local.ps1
# Arrêt : Ctrl + C
param([int]$Port = 8000)

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\') + '\'
$Mime = @{
    '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8';  '.json' = 'application/json'
    '.svg'  = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'
    '.ico'  = 'image/x-icon';  '.mp3' = 'audio/mpeg'; '.woff2' = 'font/woff2'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
try { $listener.Start() } catch { Write-Host "Impossible de demarrer sur le port $Port : $($_.Exception.Message)" -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host "  Power Up - serveur local : http://localhost:$Port" -ForegroundColor Cyan
Write-Host '  Dossier servi :' $Root
Write-Host '  Ctrl + C pour arreter.' -ForegroundColor DarkCyan
Write-Host ''

try {
    while ($listener.IsListening) {
        $task = $listener.GetContextAsync()
        while (-not $task.AsyncWaitHandle.WaitOne(300)) { }   # boucle courte : Ctrl + C reste possible
        $ctx = $task.Result; $req = $ctx.Request; $res = $ctx.Response
        try {
            $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
            if ($rel -eq '') { $rel = 'index.html' }
            $path = [IO.Path]::GetFullPath((Join-Path $Root $rel))
            $ok = $path.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase) -and
                  (Test-Path -LiteralPath $path -PathType Leaf) -and
                  ($req.HttpMethod -in 'GET', 'HEAD')
            if (-not $ok) { $res.StatusCode = 404 }
            else {
                $ext = [IO.Path]::GetExtension($path).ToLower()
                $res.ContentType = if ($Mime.ContainsKey($ext)) { $Mime[$ext] } else { 'application/octet-stream' }
                $bytes = [IO.File]::ReadAllBytes($path)
                $res.ContentLength64 = $bytes.Length
                if ($req.HttpMethod -eq 'GET') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
            }
        }
        catch { $res.StatusCode = 500 }
        finally { $res.Close() }
    }
}
finally { $listener.Stop(); Write-Host '  Serveur arrete.' -ForegroundColor Yellow }
