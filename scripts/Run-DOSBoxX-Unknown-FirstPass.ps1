param(
    [Parameter(Mandatory = $true)][int]$Opcode,
    [Parameter(Mandatory = $true)][int]$EventId,
    [Parameter(Mandatory = $true)][string]$EvidenceDirectory
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$game = Join-Path $root 'assets/generated/dosbox-x/session-002/game'
$captureDir = Join-Path $root 'assets/generated/dosbox-x/session-002/capture'
$exe = (Resolve-Path (Join-Path $root 'assets/generated/dosbox-x/runtime-2026.10.01/mingw-build/mingw-sdl2/dosbox-x.exe')).Path
$session = (Resolve-Path (Join-Path $root 'assets/generated/dosbox-x/session-002')).Path
$conf = (Resolve-Path (Join-Path $session 'dosbox-x.conf')).Path
$prepare = Join-Path $root 'tools/analyzer/prepare_synthetic_event_slot.py'
$scan = Join-Path $root 'tools/analyzer/scan_dosbox_process_memory.py'
$classify = Join-Path $root 'tools/analyzer/classify_dosbox_game_frame.py'
$reference = Join-Path $captureDir 'z_448.raw1.png'
$titleReference = Join-Path $captureDir 'z_562.raw1.png'
$loadReference = Join-Path $captureDir 'z_634.raw1.png'
$keyScript = Join-Path $PSScriptRoot 'Send-DOSBoxX-Key.ps1'
$captureScript = Join-Path $PSScriptRoot 'Capture-DOSBoxX-GameFrame.ps1'
$inventoryScript = Join-Path $PSScriptRoot 'Get-DOSBoxX-WindowInventory.ps1'
$existing = Get-CimInstance Win32_Process -Filter "Name = 'dosbox-x.exe'" | Where-Object CommandLine -like '*session-002*'
if ($existing) { throw 'Another session-002 DOSBox-X process is running' }
$prepared = $false
$proc = $null
$result = [ordered]@{ opcode = $Opcode; eventId = $EventId; evidenceDirectory = $EvidenceDirectory; status = 'started' }
try {
    & python $prepare $game $EvidenceDirectory --source-slot 1 --world-scene 32 --first-coordinate-offset 0 --second-coordinate-offset 1 --unlock-scene --spawn-near-event 0 --activate-event $EventId | Out-Null
    if ($LASTEXITCODE) { throw 'Preparation failed' }
    $prepared = $true
    $proc = Start-Process -FilePath $exe -ArgumentList @('-conf',('"' + $conf + '"'),'-nopromptfolder') -WorkingDirectory $session -PassThru
    Start-Sleep -Seconds 9
    $windows = & $inventoryScript | ConvertFrom-Json
    $window = @($windows | Where-Object { $_.processId -eq $proc.Id -and $_.className -eq 'SDL_app' })[0]
    if (-not $window) { throw 'Exact SDL game window not found' }
    $title = 'DOSBox-X 2026.10.01: Z - 20000 cycles/ms'
    $hwnd = [long]$window.hwndDecimal
    $result.pid = $proc.Id
    $result.hwnd = $hwnd
    $titleReady = $false
    for ($attempt = 1; $attempt -le 12; $attempt++) {
        $currentWindow = @((& $inventoryScript | ConvertFrom-Json) | Where-Object { $_.processId -eq $proc.Id })[0]
        if ($currentWindow.title -eq $title) {
            $titleFrame = & $captureScript -WindowHandle $hwnd -ProcessId $proc.Id -WindowTitle $title -CaptureDirectory $captureDir | ConvertFrom-Json
            $titleStateJson = & python $classify $titleReference $titleFrame.captureFile 2>$null
            if ($LASTEXITCODE -eq 0) {
                $titleState = $titleStateJson | ConvertFrom-Json
                if ($titleState.changeRatio.bottom_dialogue -lt 0.06) { $titleReady = $true; break }
            }
        }
        Start-Sleep -Seconds 2
    }
    if (-not $titleReady) { throw 'Stable game title menu not observed' }
    $result.titleFrame = $titleFrame.captureFile
    function Send-Key([string]$name) {
        & $keyScript -Key $name -WindowTitle $title -WindowHandle $hwnd | Out-Null
        if ($LASTEXITCODE) { throw "Key failed: $name" }
    }
    Send-Key 'Down'; Start-Sleep -Milliseconds 1400
    Send-Key 'Enter'; Start-Sleep -Seconds 3
    $loadReady = $false
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        $menuFrame = & $captureScript -WindowHandle $hwnd -ProcessId $proc.Id -WindowTitle $title -CaptureDirectory $captureDir | ConvertFrom-Json
        $menuStateJson = & python $classify $loadReference $menuFrame.captureFile 2>$null
        if ($LASTEXITCODE -eq 0) {
            $menuState = $menuStateJson | ConvertFrom-Json
            if ($menuState.changeRatio.bottom_dialogue -lt 0.05) { $loadReady = $true; break }
        }
        Start-Sleep -Seconds 2
    }
    if (-not $loadReady) { throw 'Load-progress menu not observed' }
    $result.loadMenuFrame = $menuFrame.captureFile
    Send-Key 'Down'; Start-Sleep -Milliseconds 1400
    Send-Key 'Down'; Start-Sleep -Milliseconds 1400
    Send-Key 'Enter'; Start-Sleep -Seconds 7
    Send-Key 'Up'; Start-Sleep -Seconds 8
    $needleWords = if ($EventId -eq 0) { 11 } else { 5 }
    $pre = & python $scan $proc.Id (Join-Path $game 'D3.GRP') --scene 32 --slot 0 --expected-event $EventId --needle-words $needleWords | ConvertFrom-Json
    $result.loadedCount = $pre.candidateCount
    if ($pre.candidateCount -ne 1) {
        $loadFrame = & $captureScript -WindowHandle $hwnd -ProcessId $proc.Id -WindowTitle $title -CaptureDirectory $captureDir | ConvertFrom-Json
        $loadState = & python $classify $loadReference $loadFrame.captureFile | ConvertFrom-Json
        $result.loadRetryFrame = $loadFrame.captureFile
        if ($loadState.changeRatio.bottom_dialogue -lt 0.05) {
            Send-Key 'Enter'; Start-Sleep -Seconds 8
            Send-Key 'Up'; Start-Sleep -Seconds 8
            $pre = & python $scan $proc.Id (Join-Path $game 'D3.GRP') --scene 32 --slot 0 --expected-event $EventId --needle-words $needleWords | ConvertFrom-Json
            $result.loadedCount = $pre.candidateCount
        }
    }
    if ($pre.candidateCount -ne 1) { throw 'Target event did not load uniquely' }
    $address = $pre.candidateHostAddresses[0]
    $result.beforeWords = $pre.candidateRecords[0].words
    Send-Key 'Left'; Start-Sleep -Milliseconds 1400
    Send-Key 'Enter'; Start-Sleep -Seconds 3
    $frame = & $captureScript -WindowHandle $hwnd -ProcessId $proc.Id -WindowTitle $title -CaptureDirectory $captureDir | ConvertFrom-Json
    $state = & python $classify $reference $frame.captureFile | ConvertFrom-Json
    $result.firstFrame = $frame.captureFile
    $result.firstOverlayRegions = $state.overlayRegions
    $after = & python $scan $proc.Id (Join-Path $game 'D3.GRP') --scene 32 --slot 0 --expected-event $EventId --read-address $address | ConvertFrom-Json
    $result.afterWords = $after.words
    if (-not $state.overlayPresent -and $after.words[2] -eq $EventId -and $state.changeRatio.top_dialogue -lt 0.03 -and $state.changeRatio.center_prompt -lt 0.03 -and $state.changeRatio.bottom_dialogue -lt 0.03) {
        Send-Key 'Enter'; Start-Sleep -Seconds 3
        $secondFrame = & $captureScript -WindowHandle $hwnd -ProcessId $proc.Id -WindowTitle $title -CaptureDirectory $captureDir | ConvertFrom-Json
        $secondState = & python $classify $reference $secondFrame.captureFile | ConvertFrom-Json
        $result.secondFrame = $secondFrame.captureFile
        $result.secondOverlayRegions = $secondState.overlayRegions
        $afterSecond = & python $scan $proc.Id (Join-Path $game 'D3.GRP') --scene 32 --slot 0 --expected-event $EventId --read-address $address | ConvertFrom-Json
        $result.afterSecondWords = $afterSecond.words
    }
    $result.status = 'triggered_once'
} catch {
    $result.status = 'error'
    $result.error = $_.Exception.Message
    if ($proc -and $hwnd) {
        try {
            $failureFrame = & $captureScript -WindowHandle $hwnd -ProcessId $proc.Id -WindowTitle $title -CaptureDirectory $captureDir | ConvertFrom-Json
            $result.failureFrame = $failureFrame.captureFile
        } catch {
            $result.captureError = $_.Exception.Message
        }
    }
} finally {
    if ($proc) {
        $check = Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)"
        if ($check -and $check.Name -eq 'dosbox-x.exe' -and $check.CommandLine -like '*session-002*') {
            Stop-Process -Id $proc.Id
            Start-Sleep -Seconds 2
        }
        if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) { throw 'Exact DOSBox-X process still alive; restore aborted' }
    }
    if ($prepared) {
        $restored = & python $prepare $game $EvidenceDirectory --restore | ConvertFrom-Json
        if ($LASTEXITCODE) { throw 'Restore failed' }
        $result.restoredR3 = $restored.'R3.GRP'
    }
    $result | ConvertTo-Json -Depth 6 -Compress
}
