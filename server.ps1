# KOICA Exhibition Hall Audio Guide PowerShell Server
# This script runs a native HTTP web server on Windows using the .NET HttpListener class.

$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

$publicDir = Join-Path $PSScriptRoot "public"

function Get-MimeType($extension) {
    switch ($extension) {
        ".html" { return "text/html; charset=utf-8" }
        ".htm"  { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".gif"  { return "image/gif" }
        ".svg"  { return "image/svg+xml" }
        ".mp3"  { return "audio/mpeg" }
        ".wav"  { return "audio/wav" }
        ".ico"  { return "image/x-icon" }
        default { return "application/octet-stream" }
    }
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " KOICA Exhibition Hall Audio Guide Web Server " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Starting server on port $port..." -ForegroundColor Yellow
Write-Host "Local URL: http://localhost:$port/" -ForegroundColor Green
Write-Host "Press Ctrl+C in this terminal to stop the server." -ForegroundColor Yellow
Write-Host "--------------------------------------------------"

try {
    $listener.Start()
} catch {
    Write-Error "Failed to start listener on port $port. Check if another server is running."
    exit 1
}

$running = $true

# Setup Ctrl+C handler (optional, wrapped in try-catch for non-interactive hosts)
try {
    [System.Console]::CancelKeyPress += {
        Write-Host "`nStopping server..." -ForegroundColor Yellow
        $listener.Stop()
        $listener.Close()
        $running = $false
    }
} catch {
    # Non-interactive or background consoles might not support this event
}

while ($running) {
    try {
        if (-not $listener.IsListening) { break }
        
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $rawUrl = $request.RawUrl
        $httpMethod = $request.HttpMethod
        $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        
        # Enable CORS
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        # Handle Preflight OPTIONS
        if ($httpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        # Parse request path
        $urlPath = $rawUrl.Split('?')[0] # Strip query params

        # API Routes
        if ($urlPath -eq "/api/guides") {
            $guidesPath = Join-Path $publicDir "data\guides.json"
            if (Test-Path $guidesPath) {
                $response.ContentType = "application/json; charset=utf-8"
                $buffer = [System.IO.File]::ReadAllBytes($guidesPath)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.StatusCode = 200
                Write-Host "[$timestamp] $httpMethod $rawUrl - 200 OK (API)" -ForegroundColor Gray
            } else {
                $response.StatusCode = 404
                Write-Host "[$timestamp] $httpMethod $rawUrl - 404 Not Found (API data missing)" -ForegroundColor Red
            }
            $response.Close()
            continue
        }

        # API Detail Route /api/guides/{id}
        if ($urlPath -match "^/api/guides/(\d+)$") {
            $trackId = [int]$Matches[1]
            $guidesPath = Join-Path $publicDir "data\guides.json"
            if (Test-Path $guidesPath) {
                $guidesJson = Get-Content $guidesPath -Raw
                $guides = ConvertFrom-Json $guidesJson
                $guide = $guides | Where-Object { $_.id -eq $trackId }
                
                if ($guide) {
                    $response.ContentType = "application/json; charset=utf-8"
                    $jsonString = ConvertTo-Json $guide -Depth 5
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonString)
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    $response.StatusCode = 200
                    Write-Host "[$timestamp] $httpMethod $rawUrl - 200 OK (API Detail id:$trackId)" -ForegroundColor Gray
                } else {
                    $response.StatusCode = 404
                    Write-Host "[$timestamp] $httpMethod $rawUrl - 404 Not Found (Track $trackId not found)" -ForegroundColor Red
                }
            } else {
                $response.StatusCode = 404
            }
            $response.Close()
            continue
        }

        # Map to Static File
        $relativeFile = $urlPath.TrimStart('/')
        if ($relativeFile -eq "") {
            $relativeFile = "index.html"
        }
        
        $filePath = Join-Path $publicDir $relativeFile

        # Safety Check: Prevent directory traversal
        $resolvedPublicPath = [System.IO.Path]::GetFullPath($publicDir)
        $resolvedFilePath = [System.IO.Path]::GetFullPath($filePath)

        if (-not $resolvedFilePath.StartsWith($resolvedPublicPath)) {
            $response.StatusCode = 403
            Write-Host "[$timestamp] $httpMethod $rawUrl - 403 Forbidden" -ForegroundColor DarkRed
            $response.Close()
            continue
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath)
            $response.ContentType = Get-MimeType $ext
            
            # Read and send file as bytes to avoid corruption of binary files (like MP3s/SVGs)
            $buffer = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $buffer.Length
            
            try {
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.StatusCode = 200
                Write-Host "[$timestamp] $httpMethod $rawUrl - 200 OK" -ForegroundColor Gray
            } catch {
                Write-Host "[$timestamp] $httpMethod $rawUrl - Connection Reset by Peer" -ForegroundColor DarkYellow
            }
        } else {
            $response.StatusCode = 404
            $response.ContentType = "text/plain"
            $msg = "404 Not Found"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($msg)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            Write-Host "[$timestamp] $httpMethod $rawUrl - 404 Not Found" -ForegroundColor Red
        }
        $response.Close()
    } catch {
        # Check if listener is closed (occurs on clean stop)
        if (-not $running) { break }
        
        $errMsg = $_.Exception.Message
        Write-Host "Error serving request: $errMsg" -ForegroundColor Red
    }
}
