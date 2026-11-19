param(
    [Parameter(Mandatory = $true)]
    [long]$WindowHandle,

    [Parameter(Mandatory = $true)]
    [uint32]$ProcessId,

    [Parameter(Mandatory = $true)]
    [string]$WindowTitle,

    [Parameter(Mandatory = $true)]
    [string]$CaptureDirectory,

    [int]$TimeoutMs = 5000
)

$ErrorActionPreference = 'Stop'
$resolvedCaptureDirectory = [System.IO.Path]::GetFullPath($CaptureDirectory)
if (-not (Test-Path -LiteralPath $resolvedCaptureDirectory -PathType Container)) {
    throw "Capture directory does not exist: $resolvedCaptureDirectory"
}

$native = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class DosBoxGameFrameCapture_20261111 {
    public delegate bool EnumWindowsCallback(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsCallback callback, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern IntPtr GetMenu(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetSubMenu(IntPtr menu, int position);
    [DllImport("user32.dll")] public static extern int GetMenuItemCount(IntPtr menu);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetMenuString(IntPtr menu, uint item, StringBuilder text, int max, int flags);
    [DllImport("user32.dll")] public static extern uint GetMenuItemID(IntPtr menu, int position);
    [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
}
'@
Add-Type -TypeDefinition $native

$matches = [System.Collections.Generic.List[IntPtr]]::new()
$callback = [DosBoxGameFrameCapture_20261111+EnumWindowsCallback] {
    param($hWnd, $lParam)
    $title = [System.Text.StringBuilder]::new(512)
    [void][DosBoxGameFrameCapture_20261111]::GetWindowText($hWnd, $title, $title.Capacity)
    if ($hWnd.ToInt64() -eq $WindowHandle -and $title.ToString() -ceq $WindowTitle) {
        [uint32]$ownerPid = 0
        [void][DosBoxGameFrameCapture_20261111]::GetWindowThreadProcessId($hWnd, [ref]$ownerPid)
        if ($ownerPid -eq $ProcessId) { $matches.Add($hWnd) }
    }
    return $true
}
[void][DosBoxGameFrameCapture_20261111]::EnumWindows($callback, [IntPtr]::Zero)
if ($matches.Count -ne 1) {
    throw "Expected one DOSBox-X game window HWND 0x$('{0:X}' -f $WindowHandle), PID $ProcessId, title '$WindowTitle'; found $($matches.Count)."
}

$window = $matches[0]
$foregroundBefore = [DosBoxGameFrameCapture_20261111]::GetForegroundWindow().ToInt64()
$menu = [DosBoxGameFrameCapture_20261111]::GetMenu($window)
if ($menu -eq [IntPtr]::Zero) { throw 'The target game window has no Win32 menu.' }
$capturePosition = -1
for ($position = 0; $position -lt [DosBoxGameFrameCapture_20261111]::GetMenuItemCount($menu); $position++) {
    $label = [System.Text.StringBuilder]::new(256)
    [void][DosBoxGameFrameCapture_20261111]::GetMenuString($menu, [uint32]$position, $label, $label.Capacity, 0x400)
    if ($label.ToString().TrimEnd('&') -ceq 'Capture') { $capturePosition = $position; break }
}
if ($capturePosition -lt 0) { throw 'Could not find the Capture menu.' }
$captureMenu = [DosBoxGameFrameCapture_20261111]::GetSubMenu($menu, $capturePosition)
if ($captureMenu -eq [IntPtr]::Zero) { throw 'Could not open the Capture menu definition.' }
$commandId = [uint32]0
for ($position = 0; $position -lt [DosBoxGameFrameCapture_20261111]::GetMenuItemCount($captureMenu); $position++) {
    $label = [System.Text.StringBuilder]::new(256)
    [void][DosBoxGameFrameCapture_20261111]::GetMenuString($captureMenu, [uint32]$position, $label, $label.Capacity, 0x400)
    if ($label.ToString().StartsWith('Take raw screenshot', [StringComparison]::OrdinalIgnoreCase)) {
        $commandId = [DosBoxGameFrameCapture_20261111]::GetMenuItemID($captureMenu, $position)
        break
    }
}
if ($commandId -eq 0 -or $commandId -eq [uint32]::MaxValue) { throw 'Could not resolve the Take raw screenshot menu command.' }

$before = @{}
Get-ChildItem -LiteralPath $resolvedCaptureDirectory -File -Filter '*.raw1.png' | ForEach-Object { $before[$_.FullName] = $_.LastWriteTimeUtc.Ticks }
$startedUtc = [DateTime]::UtcNow
$result = [IntPtr]::Zero
$sent = [DosBoxGameFrameCapture_20261111]::SendMessageTimeout($window, 0x0111, [IntPtr]::new([long]$commandId), [IntPtr]::Zero, 0x0002, [uint32]$TimeoutMs, [ref]$result)
if ($sent -eq [IntPtr]::Zero) {
    throw "DOSBox-X did not handle the raw screenshot request; Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())."
}

$deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMs)
$created = $null
do {
    $candidate = Get-ChildItem -LiteralPath $resolvedCaptureDirectory -File -Filter '*.raw1.png' |
        Where-Object { $_.LastWriteTimeUtc -ge $startedUtc -and (!$before.ContainsKey($_.FullName) -or $_.LastWriteTimeUtc.Ticks -gt $before[$_.FullName]) } |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if ($candidate -and $candidate.Length -gt 1000) {
        $firstLength = $candidate.Length
        Start-Sleep -Milliseconds 100
        $candidate.Refresh()
        if ($candidate.Length -eq $firstLength) {
            $created = $candidate
            break
        }
    }
    Start-Sleep -Milliseconds 100
} while ([DateTime]::UtcNow -lt $deadline)

if (-not $created) {
    throw "DOSBox-X accepted menu command $commandId but created no new *.raw1.png under $resolvedCaptureDirectory."
}
$foregroundAfter = [DosBoxGameFrameCapture_20261111]::GetForegroundWindow().ToInt64()

[pscustomobject]@{
    processId = $ProcessId
    hwnd = '0x{0:X}' -f $WindowHandle
    title = $WindowTitle
    commandId = $commandId
    captureFile = $created.FullName
    bytes = $created.Length
    foregroundBefore = if ($foregroundBefore -ne 0) { '0x{0:X}' -f $foregroundBefore } else { $null }
    foregroundAfter = if ($foregroundAfter -ne 0) { '0x{0:X}' -f $foregroundAfter } else { $null }
    foregroundObserved = ($foregroundBefore -ne 0 -and $foregroundAfter -ne 0)
    foregroundUnchanged = ($foregroundBefore -ne 0 -and $foregroundBefore -eq $foregroundAfter)
} | ConvertTo-Json -Compress
