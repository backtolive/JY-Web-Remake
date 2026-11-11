param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Up', 'Down', 'Left', 'Right', 'Escape', 'Enter')]
    [string]$Key,

    [Parameter(Mandatory = $true)]
    [string]$WindowTitle,

    [long]$WindowHandle = 0
)

$ErrorActionPreference = 'Stop'

$native = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class DosBoxKeyMessage_20261111 {
    public delegate bool EnumWindowsCallback(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsCallback callback, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")]
    public static extern uint MapVirtualKey(uint code, uint mapType);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
}
'@
Add-Type -TypeDefinition $native

$windows = [System.Collections.Generic.List[object]]::new()
$callback = [DosBoxKeyMessage_20261111+EnumWindowsCallback] {
    param($hWnd, $lParam)
    $titleBuilder = [System.Text.StringBuilder]::new(512)
    [void][DosBoxKeyMessage_20261111]::GetWindowText($hWnd, $titleBuilder, $titleBuilder.Capacity)
    if ($titleBuilder.ToString() -ceq $WindowTitle -and ($WindowHandle -eq 0 -or $hWnd.ToInt64() -eq $WindowHandle)) {
        [uint32]$ownerPid = 0
        [void][DosBoxKeyMessage_20261111]::GetWindowThreadProcessId($hWnd, [ref]$ownerPid)
        $windows.Add([pscustomobject]@{ Hwnd = $hWnd; Pid = $ownerPid; Title = $titleBuilder.ToString() })
    }
    return $true
}
[void][DosBoxKeyMessage_20261111]::EnumWindows($callback, [IntPtr]::Zero)

if ($windows.Count -ne 1) {
    $selector = if ($WindowHandle -ne 0) { "HWND 0x$('{0:X}' -f $WindowHandle) and title '$WindowTitle'" } else { "exact window title '$WindowTitle'" }
    throw "Expected one DOSBox-X $selector; found $($windows.Count). No key was sent."
}

$keyInfo = @{
    Up = @{ VirtualKey = 0x26; Extended = $true }
    Down = @{ VirtualKey = 0x28; Extended = $true }
    Left = @{ VirtualKey = 0x25; Extended = $true }
    Right = @{ VirtualKey = 0x27; Extended = $true }
    Escape = @{ VirtualKey = 0x1B; Extended = $false }
    Enter = @{ VirtualKey = 0x0D; Extended = $false }
}[$Key]
$scanCode = [DosBoxKeyMessage_20261111]::MapVirtualKey([uint32]$keyInfo.VirtualKey, 0)
$flags = ([long]1) -bor (([long]$scanCode) -shl 16)
if ($keyInfo.Extended) { $flags = $flags -bor ([long]1 -shl 24) }
$keyDownLParam = [IntPtr]::new($flags)
$keyUpLParam = [IntPtr]::new($flags -bor ([long]0xC0000000))
$target = $windows[0]

if (-not [DosBoxKeyMessage_20261111]::PostMessage($target.Hwnd, 0x0100, [IntPtr]::new([long]$keyInfo.VirtualKey), $keyDownLParam)) {
    throw "PostMessage WM_KEYDOWN failed for HWND 0x$('{0:X}' -f $target.Hwnd.ToInt64()); Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())."
}
Start-Sleep -Milliseconds 40
if (-not [DosBoxKeyMessage_20261111]::PostMessage($target.Hwnd, 0x0101, [IntPtr]::new([long]$keyInfo.VirtualKey), $keyUpLParam)) {
    throw "PostMessage WM_KEYUP failed for HWND 0x$('{0:X}' -f $target.Hwnd.ToInt64()); Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())."
}
$delivery = 'PostMessage WM_KEYDOWN + WM_KEYUP'

[pscustomobject]@{
    targetPid = $target.Pid
    windowTitle = $target.Title
    hwnd = '0x{0:X}' -f $target.Hwnd.ToInt64()
    key = $Key
    delivery = $delivery
    note = 'Messages queued to the exact window; this return does not prove DOSBox-X or the DOS game consumed them.'
} | ConvertTo-Json -Compress
