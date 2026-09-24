param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version
)

$ErrorActionPreference = 'Stop'
$repoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tempPath = Join-Path ([System.IO.Path]::GetTempPath()) ("portable-agent-contracts-" + [guid]::NewGuid())
$archiveName = "portable-agent-contracts-$Version.tgz"
$archivePath = Join-Path $tempPath $archiveName
$checksumPath = Join-Path $tempPath 'SHA256SUMS'
$releaseUrl = "https://github.com/portable-agent/contracts/releases/download/v$Version"
$files = @(
    @{ Archive = 'package/openapi/channel-gateway-api.yaml'; Target = 'contracts/channel-gateway-api.yaml'; HasVersion = $true },
    @{ Archive = 'package/openapi/action-api.yaml'; Target = 'contracts/action-api.yaml'; HasVersion = $true },
    @{ Archive = 'package/openapi/agent-runtime-api.yaml'; Target = 'contracts/agent-runtime-api.yaml'; HasVersion = $true },
    @{ Archive = 'package/openapi/conversation-api.yaml'; Target = 'contracts/conversation-api.yaml'; HasVersion = $true },
    @{ Archive = 'package/schemas/action-confirmation.schema.json'; Target = 'schemas/action-confirmation.schema.json'; HasVersion = $false }
)
$staged = @{}
$backups = @{}
$replaced = @()

try {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw 'GitHub CLI is required to verify the contract attestation.'
    }
    New-Item -ItemType Directory -Path $tempPath | Out-Null
    Invoke-WebRequest -Uri "$releaseUrl/$archiveName" -OutFile $archivePath
    Invoke-WebRequest -Uri "$releaseUrl/SHA256SUMS" -OutFile $checksumPath

    $escapedName = [regex]::Escape($archiveName)
    $entries = @(Get-Content -LiteralPath $checksumPath | Where-Object {
        $_ -match "^(?<hash>[a-fA-F0-9]{64})\s+\*?$escapedName$"
    })
    if ($entries.Count -ne 1) {
        throw 'Checksum file does not contain exactly one entry for the contract bundle.'
    }
    $null = $entries[0] -match '^(?<hash>[a-fA-F0-9]{64})'
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash -ne $Matches.hash.ToUpperInvariant()) {
        throw 'Checksum contract bundle does not match the release.'
    }

    & gh attestation verify $archivePath --repo portable-agent/contracts
    if ($LASTEXITCODE -ne 0) {
        throw 'Cannot verify the GitHub attestation for the contract bundle.'
    }

    foreach ($file in $files) {
        & tar -xzf $archivePath -C $tempPath $file.Archive
        if ($LASTEXITCODE -ne 0) {
            throw "Cannot unpack $($file.Archive)."
        }
        $source = Join-Path $tempPath $file.Archive
        if ($file.HasVersion -and
            (Get-Content -Raw -LiteralPath $source) -notmatch "(?m)^  version: $([regex]::Escape($Version))$") {
            throw "$($file.Archive) version does not match the requested release."
        }
        $target = Join-Path $repoPath $file.Target
        $staged[$file.Target] = "$target.$([guid]::NewGuid()).stage"
        $backups[$file.Target] = "$target.$([guid]::NewGuid()).backup"
        Copy-Item -LiteralPath $source -Destination $staged[$file.Target]
    }

    foreach ($file in $files) {
        $target = Join-Path $repoPath $file.Target
        [System.IO.File]::Replace($staged[$file.Target], $target, $backups[$file.Target], $true)
        $replaced += $file.Target
    }
    Write-Output "Telegram Adapter contracts updated to version $Version."
} catch {
    foreach ($target in $replaced) {
        if (Test-Path -LiteralPath $backups[$target]) {
            Copy-Item -LiteralPath $backups[$target] -Destination (Join-Path $repoPath $target) -Force
        }
    }
    throw
} finally {
    foreach ($path in @($staged.Values) + @($backups.Values)) {
        if ($path -and (Test-Path -LiteralPath $path)) {
            Remove-Item -LiteralPath $path -Force
        }
    }
    $resolvedTemp = [System.IO.Path]::GetFullPath($tempPath)
    $systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($systemTemp, [System.StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $resolvedTemp)) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
    }
}
