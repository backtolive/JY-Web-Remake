param(
    [Parameter(Mandatory = $true)][long]$WindowHandle,
    [Parameter(Mandatory = $true)][int]$ProcessId,
    [Parameter(Mandatory = $true)][string]$WindowTitle,
    [Parameter(Mandatory = $true)][string]$ReferenceFrame,
    [Parameter(Mandatory = $true)][string]$CaptureDirectory,
    [int]$MaxSteps = 25
)

$ErrorActionPreference = 'Stop'
if ($MaxSteps -lt 1 -or $MaxSteps -gt 100) { throw 'MaxSteps must be 1..100' }
$root = Split-Path -Parent $PSScriptRoot
$keyScript = Join-Path $PSScriptRoot 'Send-DOSBoxX-Key.ps1'
$captureScript = Join-Path $PSScriptRoot 'Capture-DOSBoxX-GameFrame.ps1'
$classifier = Join-Path $root 'tools/analyzer/classify_dosbox_game_frame.py'

function Get-OverlayState {
    $captureJson = & $captureScript -WindowHandle $WindowHandle -ProcessId $ProcessId -WindowTitle $WindowTitle -CaptureDirectory $CaptureDirectory
    if ($LASTEXITCODE) { throw 'Game-only capture failed' }
    $capture = $captureJson | ConvertFrom-Json
    $stateJson = python $classifier $ReferenceFrame $capture.captureFile
    if ($LASTEXITCODE) { throw 'Frame classification failed' }
    $state = $stateJson | ConvertFrom-Json
    return [pscustomobject]@{ Capture = $capture; State = $state }
}

$initial = Get-OverlayState
if (-not $initial.State.overlayPresent) {
    throw "Expected an active dialogue/notification overlay; captured $($initial.Capture.captureFile)"
}
Write-Output "initial=$($initial.Capture.captureFile) regions=$($initial.State.overlayRegions -join ',')"
for ($step = 1; $step -le $MaxSteps; $step++) {
    & $keyScript -Key Enter -WindowTitle $WindowTitle -WindowHandle $WindowHandle | Out-Null
    if ($LASTEXITCODE) { throw 'Enter delivery failed' }
    Start-Sleep -Seconds 2
    $result = Get-OverlayState
    Write-Output "step=$step file=$($result.Capture.captureFile) overlay=$($result.State.overlayPresent) regions=$($result.State.overlayRegions -join ',')"
    if (-not $result.State.overlayPresent) {
        Start-Sleep -Seconds 3
        $settled = Get-OverlayState
        Write-Output "settled=$(-not $settled.State.overlayPresent) file=$($settled.Capture.captureFile)"
        if ($settled.State.overlayPresent) { throw 'Overlay returned after clear frame' }
        exit 0
    }
}
throw "Overlay did not clear after $MaxSteps Enter presses"
