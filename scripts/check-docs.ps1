$ErrorActionPreference = "Stop"

$requiredFiles = @(
    "README.md",
    "AGENTS.md",
    "SERVICE.md",
    "catalog-info.yaml",
    "mkdocs.yml",
    "docs/index.md",
    "docs/architecture.md",
    "docs/development.md",
    "docs/runbook.md",
    "docs/decisions/0001-device-link.md",
    "docs/decisions/0002-confirmation-callback.md"
)

$missingFiles = $requiredFiles | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) }
if ($missingFiles.Count -gt 0) {
    throw "Required documentation files are missing: $($missingFiles -join ', ')"
}

$catalogText = Get-Content -LiteralPath "catalog-info.yaml" -Raw
if ($catalogText -notmatch "backstage\.io/techdocs-ref:\s*dir:\.") {
    throw "catalog-info.yaml must contain backstage.io/techdocs-ref: dir:."
}

$serviceText = Get-Content -LiteralPath "SERVICE.md" -Raw
if ($serviceText -notmatch "Device Flow" -or $serviceText -notmatch "refresh token") {
    throw "SERVICE.md must describe identity link and token storage."
}

Write-Host "Telegram Adapter documentation checks passed."
