[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$metaRoot = Split-Path -Parent $scriptDir
$models = @(
    'kamekichi128/qwen3-4b-instruct-2507:latest',
    'qwen3:1.7b',
    'deepseek-r1:7b'
)

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

Push-Location $metaRoot
try {
    $services = (& docker compose ps --status running --services) | Where-Object { $_ }
}
finally {
    Pop-Location
}

if ($services -notcontains 'ollama') {
    throw '服务 ollama 没有在运行。请先执行 MetaAgents/docker-compose.yml 对应的 docker compose up -d --build。'
}

foreach ($model in $models) {
    Write-Host "Pulling $model ..."
    $exitCode = Invoke-Compose -Args @('exec', '-T', 'ollama', 'ollama', 'pull', $model)
    if ($exitCode -ne 0) {
        throw "模型拉取失败: $model"
    }
}

Write-Host ''
Write-Host 'Installed models:'
[void](Invoke-Compose -Args @('exec', '-T', 'ollama', 'ollama', 'list'))
