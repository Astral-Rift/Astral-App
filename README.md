# Astral-App
Astral App — Archivos de configuración
Este repositorio contiene todos los archivos de configuración utilizados en el proyecto Astral App — Servicio de hosting de juegos en línea, desarrollado como Trabajo de Fin de Grado del Ciclo Formativo de Administración de Sistemas Informáticos en Red (ASIR) en el IES Tiempos Modernos, Zaragoza, durante el curso 2025-2026.
El objetivo de este repositorio es servir como referencia documental del proyecto, permitiendo que cualquier persona pueda entender cómo está configurada la infraestructura y reproducirla si lo desea.

⚠️ AVISO DE SEGURIDAD: Todos los datos sensibles han sido eliminados y sustituidos por el marcador [CENSURADO]. Esto incluye tokens de API de Cloudflare, contraseñas de base de datos, claves JWT, credenciales SMTP y cualquier otro dato que pudiera comprometer la seguridad del sistema. Nunca subas estos archivos con datos reales a un repositorio público.


¿Qué es Astral App?
Astral App es una plataforma web de hosting de servidores de juegos en línea desarrollada íntegramente desde cero. Permite a los usuarios crear, gestionar y monitorizar servidores de Minecraft, Project Zomboid y Valheim desde un panel web intuitivo, sin necesidad de conocimientos técnicos previos.
La plataforma está construida sobre una infraestructura doméstica compuesta por un mini-router NanoPi R5C que actúa como proxy inverso y un servidor principal con Proxmox VE donde corre una máquina virtual Debian 12 con todos los servicios necesarios.

Estructura del repositorio
astral-app-config/
├── haproxy/
│   └── haproxy.cfg          # Configuración del proxy inverso en el NanoPi R5C
│                            # Gestiona el tráfico HTTPS y TCP de los servidores de juego
├── ddns/
│   ├── docker-compose.yml   # Despliegue del cliente DDNS mediante Docker Compose
│   └── config.json          # Configuración del cliente cloudflare-ddns
│                            # Mantiene el dominio actualizado con la IP pública
├── apache/
│   └── astralapp.conf       # VirtualHost de Apache en la VM Debian 12
│                            # Redirige el tráfico al backend (puerto 3000) y frontend (puerto 4000)
├── docker/
│   ├── Dockerfile           # Imagen Docker personalizada para Project Zomboid
│   └── start.sh             # Script de arranque del servidor de Project Zomboid
│                            # Resuelve el problema del input interactivo de la contraseña
├── database/
│   └── schema.sql           # Schema completo de la base de datos MariaDB
│                            # Incluye tablas, relaciones y datos iniciales
└── env/
    └── .env.example         # Variables de entorno del backend con valores de ejemplo
                             # Copiar como .env y rellenar con los valores reales

Infraestructura
ComponenteHardwareSistema operativoIP localProxy inversoNanoPi R5CDebian 13 ARM192.168.1.40Servidor principalXeon E5-2650L v3 / 32 GB RAM / 500 GB SSDProxmox VE192.168.1.50Máquina virtual20 vCPU / 28 GB RAM / 200 GBDebian 12192.168.1.60

Stack tecnológico
CapaTecnologíaDescripciónFrontendNext.js 16 + React + JSXPanel web del usuarioBackendNode.js 22 + FastifyAPI REST del servidorBase de datosMariaDBAlmacenamiento de datosContenedoresDockerAislamiento de servidores de juegoProxy inversoHAProxyGestión del tráfico de red y SSLServidor webApacheIntermediario entre HAProxy y los serviciosGestor de procesosPM2Gestión y arranque automático de serviciosDDNScloudflare-ddnsActualización automática del DNSSSLLet's Encrypt + CertbotCertificados SSL gratuitos

Juegos soportados
JuegoImagen DockerPuertoMinecraftitzg/minecraft-serverTCP 25565Project Zomboidastral-pz:latest (imagen propia)UDP 16261Valheimlloesche/valheim-serverUDP 2456-2457

Cómo usar estos archivos
1. HAProxy — Copiar haproxy/haproxy.cfg a /etc/haproxy/haproxy.cfg en el NanoPi R5C. Adaptar las IPs según tu red local.
2. DDNS — Copiar ddns/ a /root/cloudflare-ddns/ en el NanoPi R5C. Rellenar config.json con tu API token y zone_id de Cloudflare. Arrancar con docker compose up -d.
3. Apache — Copiar apache/astralapp.conf a /etc/apache2/sites-available/ en la VM. Activar con a2ensite astralapp.conf && systemctl reload apache2.
4. Project Zomboid — Copiar docker/ a /opt/astral-pz/ en la VM. Construir la imagen con docker build -t astral-pz:latest /opt/astral-pz/.
5. Base de datos — Ejecutar database/schema.sql en MariaDB tras crear la base de datos y el usuario.
6. Variables de entorno — Copiar env/.env.example como /var/www/astralapp/backend/.env y rellenar todos los valores censurados.

Autor
Andrei Ionut Popa
IES Tiempos Modernos — Zaragoza
Ciclo Formativo de Grado Superior — ASIR
Curso 2025-2026

Licencia
Este proyecto se comparte con fines educativos y de documentación académica.
