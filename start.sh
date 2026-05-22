#!/bin/bash
set -e

STEAMCMD="/server/steamcmd/steamcmd.sh"
INSTALL_DIR="/server/game"

mkdir -p "$INSTALL_DIR"
mkdir -p /home/container/.cache

# Descargar/actualizar SteamCMD si no existe
if [ ! -f "$STEAMCMD" ]; then
    echo "[*] Descargando SteamCMD..."
    cd /server/steamcmd
    curl -sSL -o steamcmd.tar.gz https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz
    tar -xzf steamcmd.tar.gz
    rm steamcmd.tar.gz
fi

# Instalar/actualizar el juego
if [ "$AUTO_UPDATE" = "1" ] || [ ! -f "$INSTALL_DIR/ProjectZomboid64" ]; then
    echo "[*] Instalando/actualizando Project Zomboid (AppID: $SRCDS_APPID)..."
    "$STEAMCMD" \
        +force_install_dir "$INSTALL_DIR" \
        +login anonymous \
        +app_update "$SRCDS_APPID" validate \
        +quit

    # Librerías Steam
    mkdir -p "$INSTALL_DIR/.steam/sdk32" "$INSTALL_DIR/.steam/sdk64"
    cp -f /server/steamcmd/linux32/steamclient.so "$INSTALL_DIR/.steam/sdk32/steamclient.so" 2>/dev/null || true
    cp -f /server/steamcmd/linux64/steamclient.so "$INSTALL_DIR/.steam/sdk64/steamclient.so" 2>/dev/null || true
fi

echo "[*] Arrancando Project Zomboid..."
echo "[*] Servidor: $SERVER_NAME | Admin: $ADMIN_USER | Puerto: $SERVER_PORT"

cd "$INSTALL_DIR"

export PATH="./jre64/bin:$PATH"
export LD_LIBRARY_PATH="./linux64:./natives:.:./jre64/lib/amd64:${LD_LIBRARY_PATH}"
export JSIG="libjsig.so"
export LD_PRELOAD="${LD_PRELOAD}:${JSIG}"

exec ./ProjectZomboid64 \
    -port "$SERVER_PORT" \
    -udpport "$STEAM_PORT" \
    -cachedir=/home/container/.cache \
    -servername "$SERVER_NAME" \
    -adminusername "$ADMIN_USER" \
    -adminpassword "$ADMIN_PASSWORD"
