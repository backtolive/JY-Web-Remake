param(
    [Parameter(Mandatory = $true)][long]$WindowHandle,
    [Parameter(Mandatory = $true)][uint32]$ProcessId,
    [Parameter(Mandatory = $true)][string]$WindowTitle,
    [Parameter(Mandatory = $true)][string]$MenuLabel,
    [string]$MenuName = 'Capture'
)

$ErrorActionPreference = 'Stop'
$menuScript = Join-Path $PSScriptRoot 'Get-DOSBoxX-CaptureMenu.ps1'
$items = & $menuScript -WindowHandle $WindowHandle -ProcessId $ProcessId -WindowTitle $WindowTitle -MenuName $MenuName | ConvertFrom-Json
$matches = @($items | Where-Object { $_.label.StartsWith($MenuLabel,[StringComparison]::OrdinalIgnoreCase) -and $_.commandId -gt 0 -and $_.commandId -ne [uint32]::MaxValue })
if ($matches.Count -ne 1) { throw "Expected one $MenuName menu command for '$MenuLabel', got $($matches.Count)" }
$native = @'
using System;
using System.Runtime.InteropServices;
public static class DosBoxCaptureCommand_20261113 {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
}
'@
Add-Type -TypeDefinition $native
$foregroundBefore = [DosBoxCaptureCommand_20261113]::GetForegroundWindow().ToInt64()
$result = [IntPtr]::Zero
$sent = [DosBoxCaptureCommand_20261113]::SendMessageTimeout([IntPtr]::new($WindowHandle),0x0111,[IntPtr]::new([long]$matches[0].commandId),[IntPtr]::Zero,0x0002,5000,[ref]$result)
if ($sent -eq [IntPtr]::Zero) { throw "DOSBox-X did not handle Capture command; Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
$foregroundAfter = [DosBoxCaptureCommand_20261113]::GetForegroundWindow().ToInt64()
[pscustomobject]@{
    processId=$ProcessId
    hwnd=('0x{0:X}' -f $WindowHandle)
    title=$WindowTitle
    menuName=$MenuName
    menuLabel=$matches[0].label
    commandId=$matches[0].commandId
    foregroundBefore=('0x{0:X}' -f $foregroundBefore)
    foregroundAfter=('0x{0:X}' -f $foregroundAfter)
    foregroundUnchanged=($foregroundBefore -eq $foregroundAfter)
} | ConvertTo-Json -Compress
