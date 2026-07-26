# 构建并复制安装包到项目根目录
param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

Write-Host "[build-and-copy] 开始构建..." -ForegroundColor Cyan
Write-Host "[build-and-copy] 项目目录: $ProjectRoot" -ForegroundColor Gray

# 添加 cargo 到 PATH
$cargoPath = "$env:USERPROFILE\.cargo\bin"
$env:PATH = "$cargoPath;$env:PATH"

# 执行构建
Set-Location $ProjectRoot
npm run tauri:build

# 检查构建是否成功
if ($LASTEXITCODE -ne 0) {
    Write-Host "[build-and-copy] 构建失败!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 复制安装包
$bundleDir = Join-Path $ProjectRoot "src-tauri\target\release\bundle"
$destDir = Join-Path $ProjectRoot "dist-installer"

if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Write-Host "[build-and-copy] 创建目标目录: $destDir" -ForegroundColor Gray
}

# 递归查找并复制安装包
$copied = @()
function Copy-Installers {
    param([string]$Dir)
    
    if (!(Test-Path $Dir)) { return }
    
    Get-ChildItem $Dir | ForEach-Object {
        if ($_.PSIsContainer) {
            Copy-Installers $_.FullName
        } elseif ($_.Extension -in @('.exe', '.msi')) {
            $destPath = Join-Path $destDir $_.Name
            Copy-Item $_.FullName $destPath -Force
            Write-Host "[build-and-copy] 已复制: $($_.Name)" -ForegroundColor Green
            $copied += $_.Name
        }
    }
}

Copy-Installers $bundleDir

if ($copied.Count -gt 0) {
    Write-Host "" 
    Write-Host "[build-and-copy] 成功复制 $($copied.Count) 个安装包到: $destDir" -ForegroundColor Cyan
    Write-Host "[build-and-copy] 文件列表:" -ForegroundColor Cyan
    $copied | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
} else {
    Write-Host "[build-and-copy] 未找到安装包" -ForegroundColor Yellow
}