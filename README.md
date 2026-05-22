<div align="center">

<img src="https://img.shields.io/badge/Astral_App-Game_Server_Hosting-1677ff?style=for-the-badge&logo=docker&logoColor=white"/>

# 🎮 Astral App — Archivos de configuración

**Trabajo de Fin de Grado · ASIR · IES Tiempos Modernos, Zaragoza · 2025-2026**

*Plataforma web de hosting de servidores de juegos en línea desarrollada íntegramente desde cero*

---

[![HAProxy](https://img.shields.io/badge/HAProxy-Proxy_Inverso-blue?style=flat-square)](https://www.haproxy.org)
[![Docker](https://img.shields.io/badge/Docker-Contenedores-2496ED?style=flat-square&logo=docker)](https://www.docker.com)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![MariaDB](https://img.shields.io/badge/MariaDB-Base_de_datos-003545?style=flat-square&logo=mariadb)](https://mariadb.org)

</div>

---

> ⚠️ **AVISO DE SEGURIDAD**
> Todos los datos sensibles han sido eliminados y sustituidos por el marcador `[CENSURADO]`.
> Esto incluye tokens de API, contraseñas, claves JWT y credenciales SMTP.
> **Nunca subas estos archivos con datos reales a un repositorio público.**

---

## 📖 ¿Qué es Astral App?

Astral App es una plataforma web de hosting de servidores de juegos en línea desarrollada íntegramente desde cero como proyecto de fin de grado. Permite a los usuarios crear, gestionar y monitorizar servidores de **Minecraft**, **Project Zomboid** y **Valheim** desde un panel web intuitivo, sin necesidad de conocimientos técnicos previos.

La plataforma está construida sobre una infraestructura doméstica compuesta por un mini-router **NanoPi R5C** que actúa como proxy inverso y un servidor principal con **Proxmox VE** donde corre una máquina virtual Debian 12 con todos los servicios necesarios.

---

## 📁 Estructura del repositorio

```
astral-app-config/
│
├── 📂 haproxy/
│   └── haproxy.cfg          → Proxy inverso en el NanoPi R5C
│                              Gestiona tráfico HTTPS y TCP de los servidores de juego
│
├── 📂 ddns/
│   ├── docker-compose.yml   → Despliegue del cliente DDNS con Docker Compose
│   └── config.json          → Configuración de cloudflare-ddns
│                              Mantiene el dominio actualizado con la IP pública
│
├── 📂 apache/
│   └── astralapp.conf       → VirtualHost de Apache en la VM Debian 12
│                              Redirige tráfico al backend (:3000) y frontend (:4000)
│
├── 📂 docker/
│   ├── Dockerfile           → Imagen Docker personalizada para Project Zomboid
│   └── start.sh             → Script de arranque del servidor de Project Zomboid
│                              Resuelve el problema del input interactivo de la contraseña
│
├── 📂 database/
│   └── schema.sql           → Schema completo de la base de datos MariaDB
│                              Incluye tablas, relaciones y datos iniciales
│
└── 📂 env/
    └── .env.example         → Variables de entorno del backend
                               Copiar como .env y rellenar con los valores reales
```

---

## 🖥️ Infraestructura

| Componente | Hardware | Sistema operativo | IP local |
|:----------:|:--------:|:-----------------:|:--------:|
| 🔀 Proxy inverso | NanoPi R5C | Debian 13 ARM | 192.168.1.40 |
| ⚙️ Hipervisor | Xeon E5-2650L v3 / 32 GB RAM / 500 GB SSD | Proxmox VE | 192.168.1.50 |
| 🐧 Máquina virtual | 20 vCPU / 28 GB RAM / 200 GB | Debian 12 | 192.168.1.60 |

---

## 🛠️ Stack tecnológico

| Capa | Tecnología | Descripción |
|:----:|:----------:|:-----------:|
| 🎨 Frontend | Next.js 16 + React + JSX | Panel web del usuario |
| ⚡ Backend | Node.js 22 + Fastify | API REST del servidor |
| 🗄️ Base de datos | MariaDB | Almacenamiento de datos |
| 📦 Contenedores | Docker | Aislamiento de servidores de juego |
| 🔀 Proxy inverso | HAProxy | Gestión del tráfico de red y SSL |
| 🌐 Servidor web | Apache | Intermediario entre HAProxy y servicios |
| 🔄 Procesos | PM2 | Gestión y arranque automático |
| 🌍 DDNS | cloudflare-ddns | Actualización automática del DNS |
| 🔒 SSL | Let's Encrypt + Certbot | Certificados SSL gratuitos |

---

## 🎮 Juegos soportados

| Juego | Imagen Docker | Protocolo | Puerto |
|:-----:|:------------:|:---------:|:------:|
| ⛏️ Minecraft | `itzg/minecraft-server` | TCP | 25565 |
| 🧟 Project Zomboid | `astral-pz:latest` *(imagen propia)* | UDP | 16261 |
| ⚔️ Valheim | `lloesche/valheim-server` | UDP | 2456-2457 |

---

## 🚀 Cómo usar estos archivos

**1️⃣ HAProxy**
```bash
cp haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg
systemctl restart haproxy
```

**2️⃣ DDNS**
```bash
cp -r ddns/ /root/cloudflare-ddns/
# Editar config.json con tu API token y zone_id de Cloudflare
cd /root/cloudflare-ddns && docker compose up -d
```

**3️⃣ Apache**
```bash
cp apache/astralapp.conf /etc/apache2/sites-available/
a2ensite astralapp.conf
systemctl reload apache2
```

**4️⃣ Project Zomboid**
```bash
cp -r docker/ /opt/astral-pz/
docker build -t astral-pz:latest /opt/astral-pz/
```

**5️⃣ Base de datos**
```bash
mysql -u root -p < database/schema.sql
```

**6️⃣ Variables de entorno**
```bash
cp env/.env.example /var/www/astralapp/backend/.env
# Editar .env con los valores reales
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
