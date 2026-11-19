param(
    [Parameter(Mandatory = $true)]
    [string]$WindowTitle,

    [Parameter(Mandatory = $true)]
    [long]$WindowHandle,

    [Parameter(Mandatory = $true)]
    [uint32]$ProcessId,

    [int]$ClientX = 10,
    [int]$ClientY = 10,

    [ValidateSet('Right', 'Left')]
    [string]$Button = 'Right',

    [switch]$MoveFirst
)

$ErrorActionPreference = 'Stop'
if ($ClientX -lt 0 -or $ClientX -gt 65535 -or $ClientY -lt 0 -or $ClientY -gt 65535) {
    throw 'Client coordinates must fit in unsigned 16-bit values.'
}

$native = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class DosBoxRightClick_20261111 {
    public delegate bool EnumWindowsCallback(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsCallback callback, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll", SetLastError = true)] public static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
}
'@
Add-Type -TypeDefinition $native

$matches = [System.Collections.Generic.List[IntPtr]]::new()
$callback = [DosBoxRightClick_20261111+EnumWindowsCallback] {
    param($hWnd, $lParam)
    $title = [System.Text.StringBuilder]::new(512)
    [void][DosBoxRightClick_20261111]::GetWindowText($hWnd, $title, $title.Capacity)
    if ($hWnd.ToInt64() -eq $WindowHandle -and $title.ToString() -ceq $WindowTitle) {
        [uint32]$ownerPid = 0
        [void][DosBoxRightClick_20261111]::GetWindowThreadProcessId($hWnd, [ref]$ownerPid)
        if ($ownerPid -eq $ProcessId) { $matches.Add($hWnd) }
    }
    return $true
}
[void][DosBoxRightClick_20261111]::EnumWindows($callback, [IntPtr]::Zero)
if ($matches.Count -ne 1) {
    throw "Expected exact DOSBox-X window HWND 0x$('{0:X}' -f $WindowHandle), PID $ProcessId, title '$WindowTitle'; found $($matches.Count)."
}

$window = $matches[0]
$coordinates = ([long]$ClientY -shl 16) -bor [long]$ClientX
if ($MoveFirst) {
    if (-not [DosBoxRightClick_20261111]::PostMessage($window, 0x0200, [IntPtr]::Zero, [IntPtr]::new($coordinates))) {
        throw "PostMessage mouse move failed; Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())."
    }
    Start-Sleep -Milliseconds 80
}
$downMessage = if ($Button -eq 'Left') { 0x0201 } else { 0x0204 }
$upMessage = if ($Button -eq 'Left') { 0x0202 } else { 0x0205 }
$buttonFlag = if ($Button -eq 'Left') { 1 } else { 2 }
if (-not [DosBoxRightClick_20261111]::PostMessage($window, $downMessage, [IntPtr]::new($buttonFlag), [IntPtr]::new($coordinates))) {
    throw "PostMessage $Button button down failed; Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())."
}
Start-Sleep -Milliseconds 40
if (-not [DosBoxRightClick_20261111]::PostMessage($window, $upMessage, [IntPtr]::Zero, [IntPtr]::new($coordinates))) {
    throw "PostMessage $Button button up failed; Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())."
}
[pscustomobject]@{
    targetPid = $ProcessId
    windowTitle = $WindowTitle
    hwnd = '0x{0:X}' -f $WindowHandle
    clientX = $ClientX
    clientY = $ClientY
    button = $Button
    movedFirst = [bool]$MoveFirst
    delivery = "PostMessage $Button button down + up"
    note = 'Messages queued to the exact window; verify the resulting game page.'
} | ConvertTo-Json -Compress
