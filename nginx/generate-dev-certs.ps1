# ============================================================
# generate-dev-certs.ps1
# Genera certificados ECDSA P-384 auto-firmados para desarrollo.
# NO usar en produccion. Para produccion, usar una CA real.
# ============================================================

# --- Buscar openssl -----------------------------------------------------------
$openssl = Get-Command openssl -ErrorAction SilentlyContinue |
           Select-Object -ExpandProperty Source

if (-not $openssl) {
    $candidates = @(
        "D:\Git\usr\bin\openssl.exe"
        "C:\Program Files\Git\usr\bin\openssl.exe"
        "C:\Program Files (x86)\Git\usr\bin\openssl.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $openssl = $c; break }
    }
}

if (-not $openssl) {
    Write-Error "No se encontro openssl. Instala Git for Windows o agrega openssl al PATH."
    exit 1
}

Write-Host "Usando openssl: $openssl"

# --- Crear directorio de certificados -----------------------------------------
$certsDir = Join-Path $PSScriptRoot "certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
}

Write-Host "Generando certificado ECDSA P-384 auto-firmado..." -ForegroundColor Cyan

# --- Generar certificado ------------------------------------------------------
$keyFile = Join-Path $certsDir "server.key"
$crtFile = Join-Path $certsDir "server.crt"

& $openssl req -x509 `
    -newkey ec `
    -pkeyopt ec_paramgen_curve:P-384 `
    -keyout  $keyFile `
    -out     $crtFile `
    -days    365 `
    -nodes `
    -subj    "/CN=localhost/O=Wati Dev/C=CL" `
    -addext  "subjectAltName=DNS:localhost,IP:127.0.0.1"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Error al generar los certificados."
    exit 1
}

# --- Resultado ----------------------------------------------------------------
Write-Host ""
Write-Host "Certificados generados en: $certsDir" -ForegroundColor Green
Write-Host "   server.crt - Certificado publico  (ECDSA P-384, 365 dias)"
Write-Host "   server.key - Clave privada        (NO commitear, ya en .gitignore!)"
Write-Host ""
Write-Host "Proximo paso: docker compose up -d --build"
Write-Host "   Accede a la app en: https://localhost"
Write-Host "   (El navegador mostrara advertencia TLS - aceptar una vez para dev)"
