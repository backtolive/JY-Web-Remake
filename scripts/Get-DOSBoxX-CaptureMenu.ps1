param(
    [Parameter(Mandatory = $true)][long]$WindowHandle,
    [Parameter(Mandatory = $true)][uint32]$ProcessId,
    [Parameter(Mandatory = $true)][string]$WindowTitle,
    [string]$MenuName = 'Capture',
    [switch]$ListRoot
)

$ErrorActionPreference = 'Stop'
$native = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class DosBoxCaptureMenuInventory_20261113 {
    public delegate bool EnumWindowsCallback(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsCallback callback, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] public static extern IntPtr GetMenu(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetSubMenu(IntPtr menu, int position);
    [DllImport("user32.dll")] public static extern int GetMenuItemCount(IntPtr menu);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetMenuString(IntPtr menu, uint item, StringBuilder text, int max, int flags);
    [DllImport("user32.dll")] public static extern uint GetMenuItemID(IntPtr menu, int position);
}
'@
Add-Type -TypeDefinition $native
$matches = [System.Collections.Generic.List[IntPtr]]::new()
$callback = [DosBoxCaptureMenuInventory_20261113+EnumWindowsCallback] {
    param($hWnd, $lParam)
    $title = [System.Text.StringBuilder]::new(512)
    [void][DosBoxCaptureMenuInventory_20261113]::GetWindowText($hWnd, $title, $title.Capacity)
    if ($hWnd.ToInt64() -eq $WindowHandle -and $title.ToString() -ceq $WindowTitle) {
        [uint32]$ownerPid = 0
        [void][DosBoxCaptureMenuInventory_20261113]::GetWindowThreadProcessId($hWnd, [ref]$ownerPid)
        if ($ownerPid -eq $ProcessId) { $matches.Add($hWnd) }
    }
    return $true
}
[void][DosBoxCaptureMenuInventory_20261113]::EnumWindows($callback, [IntPtr]::Zero)
if ($matches.Count -ne 1) { throw 'Exact DOSBox-X game window not found' }
$menu = [DosBoxCaptureMenuInventory_20261113]::GetMenu($matches[0])
if ($menu -eq [IntPtr]::Zero) { throw 'Game window has no Win32 menu' }
if ($ListRoot) {
    $roots = for ($i = 0; $i -lt [DosBoxCaptureMenuInventory_20261113]::GetMenuItemCount($menu); $i++) {
        $label = [System.Text.StringBuilder]::new(256)
        [void][DosBoxCaptureMenuInventory_20261113]::GetMenuString($menu,[uint32]$i,$label,$label.Capacity,0x400)
        [pscustomobject]@{position=$i;label=$label.ToString();hasSubMenu=([DosBoxCaptureMenuInventory_20261113]::GetSubMenu($menu,$i) -ne [IntPtr]::Zero)}
    }
    $roots | ConvertTo-Json -Compress
    return
}
$capture = [IntPtr]::Zero
for ($i = 0; $i -lt [DosBoxCaptureMenuInventory_20261113]::GetMenuItemCount($menu); $i++) {
    $label = [System.Text.StringBuilder]::new(256)
    [void][DosBoxCaptureMenuInventory_20261113]::GetMenuString($menu,[uint32]$i,$label,$label.Capacity,0x400)
    if ($label.ToString().TrimEnd('&') -ceq $MenuName) {
        $capture = [DosBoxCaptureMenuInventory_20261113]::GetSubMenu($menu,$i)
        break
    }
}
if ($capture -eq [IntPtr]::Zero) { throw "Menu '$MenuName' not found" }
$items = for ($i = 0; $i -lt [DosBoxCaptureMenuInventory_20261113]::GetMenuItemCount($capture); $i++) {
    $label = [System.Text.StringBuilder]::new(256)
    [void][DosBoxCaptureMenuInventory_20261113]::GetMenuString($capture,[uint32]$i,$label,$label.Capacity,0x400)
    [pscustomobject]@{position=$i;label=$label.ToString();commandId=[DosBoxCaptureMenuInventory_20261113]::GetMenuItemID($capture,$i)}
}
$items | ConvertTo-Json -Compress
