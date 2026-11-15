# Loads backend/.env variables into the process environment and runs the Spring Boot backend
$envFile = Join-Path $PSScriptRoot "backend\.env"

if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^\s*([^#=]+)=(.*)$' } | ForEach-Object {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
    Write-Host "Loaded environment variables from backend\.env" -ForegroundColor Green
} else {
    Write-Host "Warning: backend\.env file not found." -ForegroundColor Yellow
}

Push-Location (Join-Path $PSScriptRoot "backend")
try {
    .\mvnw.cmd spring-boot:run
} finally {
    Pop-Location
}
