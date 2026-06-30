#!/bin/bash

# ==============================================================
#  Iniciando MORE Admin Local con Tunel SSH Seguro (Hetzner)
# ==============================================================

SERVER_IP="167.233.192.228"
LOCAL_PORT=5001
REMOTE_PORT=5001

echo "[*] Abriendo tunel SSH en segundo plano hacia $SERVER_IP..."
echo "    Mapeando localhost:$LOCAL_PORT -> $SERVER_IP:$REMOTE_PORT"

# Iniciar túnel en segundo plano
ssh -o StrictHostKeyChecking=no -f -N -L $LOCAL_PORT:localhost:$REMOTE_PORT root@$SERVER_IP

# Obtener el PID del proceso SSH recién iniciado que tiene el túnel abierto
SSH_PID=$(pgrep -f "ssh -o StrictHostKeyChecking=no -f -N -L $LOCAL_PORT:localhost:$REMOTE_PORT")

if [ -z "$SSH_PID" ]; then
    # Fallback si pgrep falló al detectar el comando
    SSH_PID=$(ps aux | grep "ssh" | grep "$SERVER_IP" | grep "$LOCAL_PORT" | grep -v grep | awk '{print $2}')
fi

echo "[+] Tunel SSH levantado de forma segura con PID: $SSH_PID"

# Función para limpiar el túnel al cerrar con Ctrl+C
cleanup() {
    echo -e "\n[*] Cerrando tunel SSH (Terminando proceso PID $SSH_PID)..."
    if [ ! -z "$SSH_PID" ]; then
        kill -9 $SSH_PID 2>/dev/null
    fi
    echo "[✓] Tunel SSH cerrado. Proceso terminado."
    exit 0
}

# Capturar señal de terminación (Ctrl+C)
trap cleanup SIGINT SIGTERM

echo "[*] Iniciando MORE Admin Portal..."
cd frontend/apps/more-admin

if [ ! -d "node_modules" ]; then
    echo "[i] No se encontraron dependencias, instalando con pnpm..."
    pnpm install
fi

echo "[!] Para detener MORE y cerrar el tunel SSH presiona Ctrl+C."
pnpm dev
