@echo off
setlocal
set "DOSBOX_ROOT=%~dp0..\assets\generated\dosbox-x"
set "DOSBOX_EXE=%DOSBOX_ROOT%\runtime-2026.10.01\mingw-build\mingw-sdl2\dosbox-x.exe"
set "DOSBOX_CONFIG=%DOSBOX_ROOT%\session-001\dosbox-x.conf"
if not exist "%DOSBOX_EXE%" (
    echo DOSBox-X portable runtime is missing. See docs\validation\dosbox-x-setup.md.
    exit /b 1
)
if not exist "%DOSBOX_CONFIG%" (
    echo Isolated session configuration is missing. Prepare the session first.
    exit /b 1
)
if not exist "%DOSBOX_ROOT%\session-001\game\Z.COM" (
    echo Isolated game copy is missing. Original data will not be mounted.
    exit /b 1
)
start "" /D "%DOSBOX_ROOT%\session-001" "%DOSBOX_EXE%" -conf "%DOSBOX_CONFIG%" -nopromptfolder -noconsole
exit /b %errorlevel%
