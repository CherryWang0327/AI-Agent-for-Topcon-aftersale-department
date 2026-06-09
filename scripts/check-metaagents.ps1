[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$metaRoot = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $metaRoot
$readmePath = Join-Path $metaRoot 'README.md'

if (-not (Test-Path $readmePath)) {
    throw 'Missing MetaAgents/README.md'
}

$requiredPaths = @(
    'MetaAgents/.env',
    'MetaAgents/cloudflare-whatsapp-setup.md',
    'MetaAgents/docker-compose.yml',
    'MetaAgents/docker-compose.override.yml',
    'MetaAgents/form-filler/Dockerfile',
    'MetaAgents/form-filler/app.py',
    'MetaAgents/form-filler/requirements.txt',
    'MetaAgents/form-filler/README.md',
    'MetaAgents/form-filler/report-ui/package.json',
    'MetaAgents/form-filler/report-ui/src/App.jsx',
    'MetaAgents/postgres/info_record.sql',
    'MetaAgents/n8n/imports/v1.json',
    'MetaAgents/n8n/imports/gmail.json',
    'MetaAgents/n8n/credentials/README.md',
    'MetaAgents/n8n/credentials/credential-setup.md',
    'MetaAgents/generated_forms',
    'MetaAgents/Support Request Form.xlsx',
    'MetaAgents/template.xlsx',
    'MetaAgents/scripts/import-n8n-assets.ps1',
    'MetaAgents/scripts/pull-ollama-models.ps1',
    'MetaAgents/scripts/check-metaagents.ps1'
)

$readmeContent = Get-Content $readmePath -Raw -Encoding UTF8
$regex = [regex]'`(?<path>MetaAgents/[^`]+)`'
$referencedPaths = $regex.Matches($readmeContent) | ForEach-Object { $_.Groups['path'].Value.Trim() }
$allPaths = ($requiredPaths + $referencedPaths) | Sort-Object -Unique

$missing = @()
foreach ($relativePath in $allPaths) {
    $normalized = $relativePath -replace '/', '\'
    $fullPath = Join-Path $repoRoot $normalized
    if (-not (Test-Path $fullPath)) {
        $missing += $relativePath
    }
}

if ($missing.Count -gt 0) {
    Write-Host 'Missing files or directories:'
    foreach ($path in $missing) {
        Write-Host " - $path"
    }
    exit 1
}

$sensitiveTargets = @(
    'MetaAgents/.env',
    'MetaAgents/README.md',
    'MetaAgents/n8n/credentials/credential-setup.md',
    'MetaAgents/n8n/credentials/README.md'
)

$sensitivePatterns = @(
    @{ Name = 'public CF tunnel token value'; Regex = '(?m)^CF_TUNNEL_TOKEN=(?!<)[^\r\n]+$' },
    @{ Name = 'public n8n encryption key value'; Regex = '(?m)^N8N_ENCRYPTION_KEY=(?!<)[^\r\n]+$' },
    @{ Name = 'public postgres password value'; Regex = '(?m)^FORM_FILLER_POSTGRES_PASSWORD=(?!<)[^\r\n]+$' },
    @{ Name = 'public DeepSeek API key value'; Regex = '(?m)^DEEPSEEK_API_KEY=(?!<)[^\r\n]+$' },
    @{ Name = 'Google OAuth client secret'; Regex = 'GOCSPX-' },
    @{ Name = 'DeepSeek secret key'; Regex = 'sk-[A-Za-z0-9]{10,}' },
    @{ Name = 'Gmail access token'; Regex = 'ya29\.[A-Za-z0-9\-_]+' },
    @{ Name = 'OAuth refresh token'; Regex = '1//[A-Za-z0-9\-_]+' },
    @{ Name = 'WhatsApp access token'; Regex = 'EAAR[A-Za-z0-9]+' },
    @{ Name = 'JSON clientSecret literal'; Regex = '"clientSecret"\s*:\s*"(?!<)[^"]{8,}"' },
    @{ Name = 'JSON accessToken literal'; Regex = '"accessToken"\s*:\s*"(?!<)[^"]{12,}"' },
    @{ Name = 'JSON refresh_token literal'; Regex = '"refresh_token"\s*:\s*"(?!<)[^"]{10,}"' }
)

$publicCredentialJsons = Get-ChildItem -Path (Join-Path $metaRoot 'n8n\credentials') -Filter '*.json' -File -ErrorAction SilentlyContinue
if ($publicCredentialJsons.Count -gt 0) {
    Write-Host 'Public package should not contain credential JSON files, but these files were found:'
    foreach ($file in $publicCredentialJsons) {
        Write-Host " - MetaAgents/n8n/credentials/$($file.Name)"
    }
    exit 1
}

$hits = @()
foreach ($target in $sensitiveTargets) {
    $fullPath = Join-Path $repoRoot ($target -replace '/', '\')
    if (-not (Test-Path $fullPath)) {
        continue
    }

    $content = Get-Content $fullPath -Raw -Encoding UTF8
    foreach ($pattern in $sensitivePatterns) {
        if ($content -match $pattern.Regex) {
            $hits += [pscustomobject]@{
                Path = $target
                Pattern = $pattern.Name
            }
        }
    }
}

if ($hits.Count -gt 0) {
    Write-Host 'Potential sensitive values detected in the public package:'
    foreach ($hit in $hits) {
        Write-Host " - $($hit.Path) [$($hit.Pattern)]"
    }
    exit 1
}

Write-Host "Checked $($allPaths.Count) MetaAgents paths."
Write-Host 'All referenced files and required files exist.'
Write-Host 'No obvious sensitive values were detected in the public package.'
