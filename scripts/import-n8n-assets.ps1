[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$metaRoot = Split-Path -Parent $scriptDir
$workflowImportDir = Join-Path $metaRoot 'n8n\imports'
$credImportDir = Join-Path $metaRoot 'n8n\credentials'
$credGuide = 'MetaAgents/n8n/credentials/credential-setup.md'
$credReadme = 'MetaAgents/n8n/credentials/README.md'
$containerCredDir = '/tmp/metaagents-credentials'

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    Push-Location $metaRoot
    try {
        & docker compose @Args
        return $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
}

function Get-N8nContainerId {
    Push-Location $metaRoot
    try {
        $containerId = (& docker compose ps -q n8n | Select-Object -First 1).Trim()
        return $containerId
    }
    finally {
        Pop-Location
    }
}

function Ensure-ServiceRunning {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ServiceName
    )

    $psExit = Invoke-Compose -Args @('ps', '--status', 'running', '--services')
    if ($psExit -ne 0) {
        throw 'docker compose ps failed. Start Docker Desktop and run docker compose up -d --build in MetaAgents first.'
    }

    Push-Location $metaRoot
    try {
        $services = (& docker compose ps --status running --services) | Where-Object { $_ }
    }
    finally {
        Pop-Location
    }

    if ($services -notcontains $ServiceName) {
        throw 'The n8n service is not running. Run docker compose up -d --build from MetaAgents first.'
    }
}

Write-Host 'Checking Docker services...'
Ensure-ServiceRunning -ServiceName 'n8n'

$credentialFiles = @()
if (Test-Path $credImportDir) {
    $credentialFiles = Get-ChildItem -Path $credImportDir -Filter '*.json' -File -ErrorAction SilentlyContinue
}

$credExit = 0
if ($credentialFiles.Count -gt 0) {
    Write-Host 'Credential JSON files detected in MetaAgents/n8n/credentials. Preparing temporary import inside the n8n container...'

    $containerId = Get-N8nContainerId
    if (-not $containerId) {
        throw 'Could not resolve the running n8n container ID.'
    }

    $prepExit = Invoke-Compose -Args @('exec', '-T', 'n8n', 'sh', '-lc', "rm -rf $containerCredDir && mkdir -p $containerCredDir")
    if ($prepExit -ne 0) {
        throw 'Failed to prepare the temporary credential import directory inside the n8n container.'
    }

    foreach ($file in $credentialFiles) {
        & docker cp $file.FullName "${containerId}:$containerCredDir/$($file.Name)"
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to copy credential file $($file.Name) into the n8n container."
        }
    }

    $credExit = Invoke-Compose -Args @(
        'exec', '-T', '-u', 'node', 'n8n',
        'n8n', 'import:credentials',
        '--separate',
        "--input=$containerCredDir"
    )

    $null = Invoke-Compose -Args @('exec', '-T', 'n8n', 'sh', '-lc', "rm -rf $containerCredDir")

    if ($credExit -ne 0) {
        Write-Warning "Credential import did not complete successfully. Open $credGuide to create the missing credentials manually, or re-check the credential JSON files placed in MetaAgents/n8n/credentials."
    }
}
else {
    Write-Warning "No credential JSON files were detected in MetaAgents/n8n/credentials. The script will import workflows only. Create the 5 credentials manually by following $credGuide, or copy the private credential JSON files into MetaAgents/n8n/credentials and run this script again."
}

if (-not (Test-Path (Join-Path $workflowImportDir 'v1.json')) -or -not (Test-Path (Join-Path $workflowImportDir 'gmail.json'))) {
    throw 'The flattened workflow files MetaAgents/n8n/imports/v1.json and MetaAgents/n8n/imports/gmail.json were not found.'
}

Write-Host 'Importing workflows from MetaAgents/n8n/imports ...'
$wfExit = Invoke-Compose -Args @(
    'exec', '-T', '-u', 'node', 'n8n',
    'n8n', 'import:workflow',
    '--separate',
    '--input=/imports'
)

if ($wfExit -ne 0) {
    throw 'Workflow import failed. Check that n8n owner initialization has already been completed.'
}

Write-Host ''
Write-Host 'Import finished.'
Write-Host 'Next: open n8n, confirm workflows v1 and gmail exist, bind any missing credentials manually if needed, then activate the workflows.'
if ($credExit -ne 0) {
    Write-Host "Manual setup guide: $credGuide"
}
else {
    Write-Host "Credential reference: $credReadme"
}
