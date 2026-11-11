@echo off
setlocal
set "DOSBOX_ROOT=%~dp0..\assets\generated\dosbox-x"
set "DOSBOX_EXE=%DOSBOX_ROOT%\runtime-2026.10.01\mingw-build\mingw-sdl2\dosbox-x.exe"
set "SESSION=%DOSBOX_ROOT%\session-002"
set "DOSBOX_CONFIG=%SESSION%\dosbox-x.conf"
if not exist "%DOSBOX_EXE%" (
    echo DOSBox-X portable runtime is missing. See docs\validation\dosbox-x-setup.md.
    exit /b 1
)
if not exist "%DOSBOX_CONFIG%" (
    echo Isolated session-002 configuration is missing.
    exit /b 1
)
if not exist "%SESSION%\game\Z.COM" (
    echo Isolated session-002 game copy is missing. Original data will not be mounted.
    exit /b 1
)
start "" /D "%SESSION%" "%DOSBOX_EXE%" -conf "%DOSBOX_CONFIG%" -nopromptfolder
exit /b %errorlevel%
