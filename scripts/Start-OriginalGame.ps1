param([switch]$PrepareOnly, [switch]$ShowWindow)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$originalPath = Join-Path $projectRoot 'original/dos'
$testRoot = Join-Path $projectRoot 'assets/generated/dosbox-x'
$gamePath = Join-Path $testRoot 'session-001/game'
$capturePath = Join-Path $testRoot 'session-001/capture'
$executablePath = Join-Path $testRoot 'runtime-2026.10.01/mingw-build/mingw-sdl2/dosbox-x.exe'
if (!(Test-Path -LiteralPath $executablePath)) { throw 'Download the pinned DOSBox-X portable release first; see docs/validation/dosbox-x-setup.md' }
if (!(Test-Path -LiteralPath (Join-Path $originalPath 'Z.COM'))) { throw 'Original DOS game directory is missing Z.COM' }
if (!(Test-Path -LiteralPath $gamePath)) {
    New-Item -ItemType Directory -Force -Path $gamePath | Out-Null
    Get-ChildItem -LiteralPath $originalPath -Force | Copy-Item -Destination $gamePath -Recurse
    $originalFiles = @(Get-ChildItem -LiteralPath $originalPath -File -Recurse)
    foreach ($file in $originalFiles) {
        $relativePath = [IO.Path]::GetRelativePath($originalPath, $file.FullName)
        $copyPath = Join-Path $gamePath $relativePath
        if ((Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath $copyPath).Hash) { throw "Copy verification failed: $relativePath" }
    }
    Write-Output "Verified isolated copy: $($originalFiles.Count) files"
}
New-Item -ItemType Directory -Force -Path $capturePath | Out-Null
$configPath = Join-Path $testRoot 'session-001/dosbox-x.conf'
$configText = @"
[sdl]
fullscreen=false
output=surface
autolock=false
[dosbox]
working directory option=config
machine=svga_s3
memsize=32
captures=$capturePath
[cpu]
core=normal
cycles=fixed 20000
[midi]
mididevice=none
[sblaster]
sbtype=sbpro2
sbbase=220
irq=7
dma=1
[log]
logfile=$(Join-Path $testRoot 'session-001/dosbox-x.log')
exec=true
files=true
[autoexec]
@echo off
mount c "$gamePath"
c:
z.com
"@
[IO.File]::WriteAllText($configPath, $configText, [Text.Encoding]::ASCII)
Write-Output "Config: $configPath"
if (!$PrepareOnly) {
    $windowStyle = if ($ShowWindow) { 'Normal' } else { 'Hidden' }
    $emulatorProcess = Start-Process -FilePath $executablePath -ArgumentList @('-conf', ('"' + $configPath + '"'), '-nopromptfolder', '-noconsole') -WorkingDirectory (Split-Path $configPath) -WindowStyle $windowStyle -PassThru
    Write-Output "DOSBox-X process: $($emulatorProcess.Id)"
}
