$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function New-RandomHex {
    param([int]$ByteCount)
    $bytes = New-Object byte[] $ByteCount
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
        return -join ($bytes | ForEach-Object { $_.ToString('x2') })
    } finally {
        $rng.Dispose()
    }
}

if (-not (Test-Path -LiteralPath '.env')) {
    @(
        "POSTGRES_PASSWORD=$(New-RandomHex 24)"
        "JWT_SECRET=$(New-RandomHex 32)"
        'TEST_USER_EMAIL=teste@prattio.local'
        "TEST_USER_PASSWORD=$(New-RandomHex 12)"
    ) | Set-Content -LiteralPath '.env' -Encoding ASCII
    Write-Host 'Credenciais de teste geradas no arquivo .env.'
} else {
    Write-Host 'O arquivo .env existente foi preservado.'
}

$envLines = Get-Content -LiteralPath '.env'
$hasStoreEmail = @($envLines | Where-Object { $_ -match '^TEST_STORE_USER_EMAIL=' }).Count -gt 0
$hasStorePassword = @($envLines | Where-Object { $_ -match '^TEST_STORE_USER_PASSWORD=' }).Count -gt 0
if ($hasStoreEmail -ne $hasStorePassword) {
    throw 'Configure TEST_STORE_USER_EMAIL e TEST_STORE_USER_PASSWORD juntos no arquivo .env.'
}
if (-not $hasStoreEmail) {
    @(
        'TEST_STORE_USER_EMAIL=loja@prattio.local'
        "TEST_STORE_USER_PASSWORD=$(New-RandomHex 12)"
    ) | Add-Content -LiteralPath '.env' -Encoding ASCII
    Write-Host 'Credenciais da loja de teste adicionadas ao arquivo .env.'
}

docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
    throw 'Não foi possível iniciar o ambiente Docker. Confira o Docker Desktop e o arquivo .env.'
}

Write-Host 'Abra http://127.0.0.1:18080/auth/signin'
Write-Host 'Consulte TEST_STORE_USER_EMAIL e TEST_STORE_USER_PASSWORD no arquivo .env para entrar como loja.'
