$ErrorActionPreference = 'Stop'

$native = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class DosBoxXWindowInventory_20261111 {
    public delegate bool EnumWindowsCallback(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsCallback callback, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder className, int count);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@
Add-Type -TypeDefinition $native

$windows = [System.Collections.Generic.List[object]]::new()
$callback = [DosBoxXWindowInventory_20261111+EnumWindowsCallback] {
    param($hWnd, $lParam)
    $title = [System.Text.StringBuilder]::new(512)
    [void][DosBoxXWindowInventory_20261111]::GetWindowText($hWnd, $title, $title.Capacity)
    if ($title.ToString().StartsWith('DOSBox-X', [StringComparison]::OrdinalIgnoreCase)) {
        $className = [System.Text.StringBuilder]::new(256)
        [void][DosBoxXWindowInventory_20261111]::GetClassName($hWnd, $className, $className.Capacity)
        [uint32]$ownerPid = 0
        [void][DosBoxXWindowInventory_20261111]::GetWindowThreadProcessId($hWnd, [ref]$ownerPid)
        $windows.Add([pscustomobject]@{
            hwnd = '0x{0:X}' -f $hWnd.ToInt64()
            hwndDecimal = $hWnd.ToInt64()
            processId = $ownerPid
            visible = [DosBoxXWindowInventory_20261111]::IsWindowVisible($hWnd)
            className = $className.ToString()
            title = $title.ToString()
        })
    }
    return $true
}
[void][DosBoxXWindowInventory_20261111]::EnumWindows($callback, [IntPtr]::Zero)
$windows | Sort-Object processId, title | ConvertTo-Json -Depth 3
