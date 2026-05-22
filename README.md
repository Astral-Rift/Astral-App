<div align="center">

<img src="https://img.shields.io/badge/Astral_App-Game_Server_Hosting-1677ff?style=for-the-badge&logo=docker&logoColor=white"/>

# 🎮 Astral App

### Plataforma web de hosting de servidores de juegos en línea

**Trabajo de Fin de Grado · ASIR · IES Tiempos Modernos, Zaragoza · 2025-2026**

---

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![Fastify](https://img.shields.io/badge/Fastify-Backend-000000?style=flat-square)](https://fastify.dev)
[![MariaDB](https://img.shields.io/badge/MariaDB-Database-003545?style=flat-square&logo=mariadb)](https://mariadb.org)
[![Docker](https://img.shields.io/badge/Docker-Containers-2496ED?style=flat-square&logo=docker)](https://www.docker.com)
[![HAProxy](https://img.shields.io/badge/HAProxy-Proxy-blue?style=flat-square)](https://www.haproxy.org)

</div>

---

## 📖 ¿Qué es Astral App?

Astral App es una plataforma web de hosting de servidores de juegos en línea desarrollada íntegramente desde cero. Permite a los usuarios crear, gestionar y monitorizar servidores de **Minecraft**, **Project Zomboid** y **Valheim** desde un panel web intuitivo, sin necesidad de conocimientos técnicos previos.

### ✨ Características principales

- 🖥️ **Panel web moderno** con diseño oscuro y actualización en tiempo real
- 🔒 **Autenticación JWT** con roles de usuario y administrador
- 📦 **Gestión de contenedores Docker** automática por usuario
- 📁 **Gestor de archivos** integrado con editor de texto
- 💻 **Consola de comandos** en tiempo real con soporte RCON para Minecraft
- 📊 **Estadísticas en tiempo real** de CPU, RAM y red
- 👑 **Panel de administración** completo para gestionar usuarios y planes
- 📧 **Formulario de contacto** con envío de email via SMTP

---

## 📁 Estructura del repositorio

```
astral-app/
│
├── 📂 backend/                    → Servidor API REST (Node.js + Fastify)
│   ├── package.json               → Dependencias del backend
│   ├── .env.example               → Plantilla de variables de entorno
│   └── src/
│       ├── app.js                 → Punto de entrada del servidor
│       ├── config/
│       │   └── db.js              → Pool de conexiones a MariaDB
│       ├── plugins/
│       │   └── auth.js            → Plugin de autenticación JWT
│       ├── routes/
│       │   ├── auth.js            → Login, logout y sesión
│       │   ├── servidores.js      → CRUD completo de servidores
│       │   ├── archivos.js        → Gestor de archivos de los servidores
│       │   ├── admin.js           → Panel de administración
│       │   └── contacto.js        → Formulario de contacto SMTP
│       └── services/
│           ├── docker.js          → Comunicación con la API de Docker
│           └── recursos.js        → Validación de recursos y puertos
│
├── 📂 frontend/                   → Panel web (Next.js + React)
│   ├── package.json               → Dependencias del frontend
│   ├── jsconfig.json              → Configuración de rutas
│   ├── postcss.config.mjs         → Configuración de PostCSS/Tailwind
│   ├── lib/
│   │   └── api.js                 → Centralización de llamadas a la API
│   ├── components/
│   │   ├── ServidorCard.jsx       → Tarjeta de servidor en el dashboard
│   │   ├── CrearServidorModal.jsx → Modal de creación de servidor
│   │   └── GestorArchivos.jsx     → Explorador y editor de archivos
│   └── app/
│       ├── layout.jsx             → Layout raíz de la aplicación
│       ├── page.jsx               → Página de inicio y login
│       └── dashboard/
│           ├── page.jsx           → Dashboard principal del usuario
│           └── servidor/[id]/
│               └── page.jsx       → Gestión individual de cada servidor
│
└── 📂 config/                     → Archivos de configuración de infraestructura
    ├── haproxy/
    │   └── haproxy.cfg            → Configuración del proxy inverso
    ├── ddns/
    │   ├── docker-compose.yml     → Despliegue del cliente DDNS
    │   └── config.json            → Configuración de cloudflare-ddns
    ├── apache/
    │   └── astralapp.conf         → VirtualHost de Apache
    ├── docker/
    │   ├── Dockerfile             → Imagen Docker para Project Zomboid
    │   └── start.sh               → Script de arranque de Project Zomboid
    └── database/
        └── schema.sql             → Schema completo de la base de datos
```

---

## 🖥️ Infraestructura necesaria

| Componente | Recomendado | Mínimo |
|:----------:|:-----------:|:------:|
| CPU | Xeon E5 / Ryzen 5 | 4 núcleos |
| RAM | 16-32 GB | 8 GB |
| Almacenamiento | 200+ GB SSD | 50 GB |
| Red | 100 Mbps | 20 Mbps |
| SO | Debian 12 | Ubuntu 22.04 |

---

## 🚀 Guía de instalación completa

> ⚠️ Esta guía asume que tienes una máquina con **Debian 12** o **Ubuntu 22.04** y acceso root.

### Paso 1 — Instalar dependencias del sistema

```bash
apt update && apt upgrade -y
apt install -y curl wget git sudo apache2 mariadb-server
```

### Paso 2 — Instalar Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node --version  # Verificar instalación
```

### Paso 3 — Instalar Docker

```bash
curl -fsSL https://download.docker.com/linux/debian/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/debian bookworm stable" | \
    tee /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker
```

### Paso 4 — Instalar PM2

```bash
npm install -g pm2
```

### Paso 5 — Configurar MariaDB

```bash
mysql_secure_installation

mysql -u root -p << 'SQL'
CREATE DATABASE astralapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'TU_USUARIO'@'localhost' IDENTIFIED BY 'TU_PASSWORD';
GRANT ALL PRIVILEGES ON astralapp.* TO 'TU_USUARIO'@'localhost';
FLUSH PRIVILEGES;
SQL
```

Importar el schema:

```bash
mysql -u TU_USUARIO -p astralapp < config/database/schema.sql
```

### Paso 6 — Configurar Apache

Habilitar los módulos necesarios:

```bash
a2enmod proxy proxy_http proxy_wstunnel rewrite
```

Editar `config/apache/astralapp.conf` y sustituir `TU_DOMINIO` por tu dominio real. Luego:

```bash
cp config/apache/astralapp.conf /etc/apache2/sites-available/
a2ensite astralapp.conf
systemctl reload apache2
```

### Paso 7 — Crear estructura de carpetas

```bash
mkdir -p /var/www/astralapp/backend
mkdir -p /var/www/astralapp/frontend
mkdir -p /var/lib/astralapp/volumes
mkdir -p /opt/astral-pz
```

### Paso 8 — Copiar el código

```bash
cp -r backend/* /var/www/astralapp/backend/
cp -r frontend/* /var/www/astralapp/frontend/
```

### Paso 9 — Configurar variables de entorno

```bash
cp backend/.env.example /var/www/astralapp/backend/.env
nano /var/www/astralapp/backend/.env
# Rellenar todos los valores marcados como TU_*
```

### Paso 10 — Instalar dependencias

```bash
# Backend
cd /var/www/astralapp/backend
npm install

# Frontend
cd /var/www/astralapp/frontend
npm install
npm run build
```

### Paso 11 — Construir imagen Docker de Project Zomboid

```bash
cp config/docker/Dockerfile /opt/astral-pz/
cp config/docker/start.sh /opt/astral-pz/
docker build -t astral-pz:latest /opt/astral-pz/
```

### Paso 12 — Arrancar los servicios con PM2

```bash
# Backend
pm2 start src/app.js --name astral-backend --cwd /var/www/astralapp/backend

# Frontend
pm2 start node_modules/.bin/next --name astral-frontend \
    --cwd /var/www/astralapp/frontend -- start -p 4000

# Guardar y configurar arranque automático
pm2 save
pm2 startup
```

### Paso 13 — Configurar HAProxy (si usas proxy inverso)

Editar `config/haproxy/haproxy.cfg` adaptando las IPs y dominios a tu red:

```bash
cp config/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg
systemctl restart haproxy
```

### Paso 14 — Configurar DDNS (opcional, si no tienes IP fija)

Editar `config/ddns/config.json` con tu API token y zone_id de Cloudflare:

```bash
mkdir -p /root/cloudflare-ddns
cp config/ddns/docker-compose.yml /root/cloudflare-ddns/
cp config/ddns/config.json /root/cloudflare-ddns/
cd /root/cloudflare-ddns
docker compose up -d
```

### Paso 15 — Verificar que todo funciona

```bash
pm2 list                          # Ver estado de los servicios
pm2 logs astral-backend --lines 20  # Ver logs del backend
curl http://localhost:3000/api/health  # Verificar que el backend responde
```

Si el backend responde con `{"ok":true}` todo está funcionando correctamente. Accede al panel desde tu navegador en `http://TU_IP` o `https://TU_DOMINIO`.

---

## 🎮 Juegos soportados

| Juego | Imagen Docker | Protocolo | Puerto por defecto |
|:-----:|:------------:|:---------:|:-----------------:|
| ⛏️ Minecraft | `itzg/minecraft-server` | TCP | 25565 |
| 🧟 Project Zomboid | `astral-pz:latest` *(imagen propia)* | UDP | 16261 |
| ⚔️ Valheim | `lloesche/valheim-server` | UDP | 2456-2457 |

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|:----:|:----------:|
| 🎨 Frontend | Next.js 16 + React + JSX |
| ⚡ Backend | Node.js 22 + Fastify |
| 🗄️ Base de datos | MariaDB |
| 📦 Contenedores | Docker |
| 🔀 Proxy inverso | HAProxy |
| 🌐 Servidor web | Apache |
| 🔄 Procesos | PM2 |
| 🌍 DDNS | cloudflare-ddns |
| 🔒 SSL | Let's Encrypt + Certbot |

---

## ❓ Problemas frecuentes

**El backend no arranca**
```bash
pm2 logs astral-backend --lines 50
# Verificar que el .env está bien configurado
# Verificar que MariaDB está corriendo: systemctl status mariadb
```

**No se pueden crear contenedores Docker**
```bash
# Verificar que Docker está corriendo
systemctl status docker
# Verificar permisos del socket
ls -la /var/run/docker.sock
```

**El frontend no compila**
```bash
# Verificar versión de Node.js (necesita v18+)
node --version
# Limpiar caché y recompilar
rm -rf /var/www/astralapp/frontend/.next
cd /var/www/astralapp/frontend && npm run build
```

---

## 👤 Autor

<div align="center">

**Andrei Ionut Popa**

IES Tiempos Modernos — Zaragoza
Ciclo Formativo de Grado Superior — ASIR
Curso 2025-2026

</div>

---

<div align="center">

*Este proyecto se comparte con fines educativos y de documentación académica.*

</div>
