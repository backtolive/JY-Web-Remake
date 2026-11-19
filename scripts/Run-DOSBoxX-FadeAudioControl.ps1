param(
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
$captureMenuScript = Join-Path $PSScriptRoot 'Invoke-DOSBoxX-CaptureMenu.ps1'
$existing = Get-CimInstance Win32_Process -Filter "Name = 'dosbox-x.exe'" | Where-Object CommandLine -like '*session-002*'
if ($existing) { throw 'Another session-002 DOSBox-X process is running' }
$prepared = $false
$proc = $null
$recordingStarted = $false
$result = [ordered]@{ controlOpcode = 14; eventId = 514; evidenceDirectory = $EvidenceDirectory; status = 'started' }
try {
    & python $prepare $game $EvidenceDirectory --source-slot 1 --world-scene 32 --first-coordinate-offset 0 --second-coordinate-offset 1 --unlock-scene --spawn-near-event 0 --activate-event 514 | Out-Null
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
    function Send-Key([string]$name) {
        & $keyScript -Key $name -WindowTitle $title -WindowHandle $hwnd | Out-Null
        if ($LASTEXITCODE) { throw "Key failed: $name" }
        Start-Sleep -Milliseconds 1400
    }
    function Capture-State([string]$referenceFile) {
        $frame = & $captureScript -WindowHandle $hwnd -ProcessId $proc.Id -WindowTitle $title -CaptureDirectory $captureDir | ConvertFrom-Json
        $state = & python $classify $referenceFile $frame.captureFile 2>$null | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0 -or -not $state) { throw "Frame comparison unavailable: $($frame.captureFile)" }
        return [pscustomobject]@{ frame = $frame.captureFile; state = $state }
    }
    $titleReady = $false
    for ($attempt = 1; $attempt -le 12; $attempt++) {
        $currentWindow = @((& $inventoryScript | ConvertFrom-Json) | Where-Object { $_.processId -eq $proc.Id })[0]
        if ($currentWindow.title -eq $title) {
            try {
                $s = Capture-State $titleReference
                if ($s.state.changeRatio.bottom_dialogue -lt 0.06) { $titleReady = $true; break }
            } catch { }
        }
        Start-Sleep -Seconds 2
    }
    if (-not $titleReady) { throw 'Stable title menu not observed' }
    $result.titleFrame = $s.frame
    Send-Key 'Down'; Send-Key 'Enter'; Start-Sleep -Seconds 3
    $loadReady = $false
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        $s = Capture-State $loadReference
        if ($s.state.changeRatio.bottom_dialogue -lt 0.05) { $loadReady = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $loadReady) { throw 'Load-progress menu not observed' }
    $result.loadFrame = $s.frame
    Send-Key 'Down'; Send-Key 'Down'; Send-Key 'Enter'; Start-Sleep -Seconds 7
    Send-Key 'Up'; Start-Sleep -Seconds 8
    $pre = & python $scan $proc.Id (Join-Path $game 'D3.GRP') --scene 32 --slot 0 --expected-event 514 | ConvertFrom-Json
    if ($pre.candidateCount -ne 1) { throw 'Target event did not load uniquely' }
    $result.beforeWords = $pre.candidateRecords[0].words
    $eventAddress = $pre.candidateHostAddresses[0]
    $result.audioFilesBefore = @(Get-ChildItem -LiteralPath $captureDir -File -Filter '*.wav' | Select-Object -ExpandProperty FullName)
    $result.recordStart = & $captureMenuScript -WindowHandle $hwnd -ProcessId $proc.Id -WindowTitle $title -MenuLabel 'Record audio to WAV' | ConvertFrom-Json
    $recordingStarted = $true
    Start-Sleep -Seconds 2
    Send-Key 'Left'; Send-Key 'Enter'; Start-Sleep -Seconds 3
    $s = Capture-State $reference
    $result.afterInteraction = $s.frame
    $result.overlayRegions = $s.state.overlayRegions
    Send-Key 'Enter'; Start-Sleep -Seconds 3
    $afterFade = Capture-State $reference
    $result.afterFadeFrame = $afterFade.frame
    $result.afterFadeRegions = $afterFade.state.overlayRegions
    $result.recordStop = & $captureMenuScript -WindowHandle $hwnd -ProcessId $proc.Id -WindowTitle $title -MenuLabel 'Record audio to WAV' | ConvertFrom-Json
    $recordingStarted = $false
    Start-Sleep -Seconds 2
    $result.audioFilesAfter = @(Get-ChildItem -LiteralPath $captureDir -File -Filter '*.wav' | Select-Object -ExpandProperty FullName)
    $eventAfter = & python $scan $proc.Id (Join-Path $game 'D3.GRP') --scene 32 --slot 0 --expected-event 514 --read-address $eventAddress | ConvertFrom-Json
    $result.eventAfter = $eventAfter.words
    $result.status = 'observed'
} catch {
    $result.status = 'error'
    $result.error = $_.Exception.Message
    if ($proc -and $hwnd) {
        try { $result.failureFrame = (Capture-State $reference).frame } catch { $result.captureError = $_.Exception.Message }
    }
} finally {
    if ($proc) {
        if ($recordingStarted -and $hwnd) {
            try { $result.recordCleanup = & $captureMenuScript -WindowHandle $hwnd -ProcessId $proc.Id -WindowTitle $title -MenuLabel 'Record audio to WAV' | ConvertFrom-Json } catch { $result.recordCleanupError = $_.Exception.Message }
        }
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
