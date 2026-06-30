@echo off
SETLOCAL EnableDelayedExpansion

echo ==============================================================
echo  Iniciando MORE Admin Local con Tunel SSH Seguro (Hetzner)
echo ==============================================================

SET SERVER_IP=167.233.192.228
SET LOCAL_PORT=5001
SET REMOTE_PORT=5001

echo [*] Abriendo tunel SSH en segundo plano hacia %SERVER_IP%...
echo     Mapeando localhost:%LOCAL_PORT% -> %SERVER_IP%:%REMOTE_PORT%

:: Levantar el túnel en segundo plano con PowerShell
powershell -Command "$p = Start-Process ssh -ArgumentList '-L %LOCAL_PORT%:localhost:%REMOTE_PORT% root@%SERVER_IP% -N' -PassThru -NoNewWindow; echo $p.Id" > ssh_pid.txt
set /p SSH_PID=<ssh_pid.txt
del ssh_pid.txt

echo [+] Tunel SSH levantado de forma segura con PID: %SSH_PID%
echo [*] Iniciando MORE Admin Portal...

:: Cambiar al directorio de la app e iniciar
cd frontend\apps\more-admin
if not exist "node_modules" (
    echo [i] No se encontraron dependencias, instalando con pnpm...
    call pnpm install
)

echo [!] Para detener MORE y cerrar el tunel SSH presiona Ctrl+C.
call pnpm dev

:ON_CLOSE
echo.
echo [*] Cerrando tunel SSH (Terminando proceso PID %SSH_PID%)...
taskkill /PID %SSH_PID% /F >nul 2>&1
echo [✓] Tunel SSH cerrado. Proceso terminado.
pause
