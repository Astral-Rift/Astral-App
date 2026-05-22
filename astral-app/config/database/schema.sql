-- ============================================================
-- Astral App — Schema SQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS astralapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE astralapp;

CREATE USER IF NOT EXISTS 'popa'@'localhost' IDENTIFIED BY '[CENSURADO]';
GRANT ALL PRIVILEGES ON astralapp.* TO 'popa'@'localhost';
FLUSH PRIVILEGES;

-- Tabla de planes
CREATE TABLE planes (
    id            TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre        VARCHAR(50)      NOT NULL,
    cpu_limit     TINYINT UNSIGNED NOT NULL,
    ram_limit_gb  TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (id)
);

-- Tabla de usuarios
CREATE TABLE usuarios (
    id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    username      VARCHAR(50)      NOT NULL UNIQUE,
    password_hash VARCHAR(255)     NOT NULL,
    email         VARCHAR(100)     NOT NULL UNIQUE,
    plan_id       TINYINT UNSIGNED NOT NULL,
    activo        TINYINT(1)       NOT NULL DEFAULT 1,
    rol           ENUM('user','admin') NOT NULL DEFAULT 'user',
    creado_en     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (plan_id) REFERENCES planes(id)
);

-- Tabla de servidores
CREATE TABLE servidores (
    id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id           INT UNSIGNED NOT NULL,
    nombre               VARCHAR(100) NOT NULL,
    juego                ENUM('minecraft','zomboid','valheim') NOT NULL,
    estado               ENUM('encendido','apagado','iniciando','apagando') NOT NULL DEFAULT 'apagado',
    cpu_asignada         FLOAT        NOT NULL,
    ram_asignada_gb      FLOAT        NOT NULL,
    puerto_id            INT UNSIGNED NOT NULL,
    docker_container_id  VARCHAR(255),
    creado_en            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabla de puertos de usuario
CREATE TABLE puertos_usuario (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id  INT UNSIGNED NOT NULL,
    puerto      INT UNSIGNED NOT NULL UNIQUE,
    en_uso      TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Datos iniciales — Planes
INSERT INTO planes (nombre, cpu_limit, ram_limit_gb) VALUES
('basic',  1, 2),
('medium', 2, 4),
('pro',    4, 8);

-- Usuario administrador inicial (sustituir [HASH_BCRYPT] por el hash real)
-- Generar hash: node -e "import('bcrypt').then(b => b.default.hash('TU_PASSWORD', 10).then(h => console.log(h)))"
INSERT INTO usuarios (username, password_hash, email, plan_id, activo, rol)
VALUES ('Admin', '[HASH_BCRYPT]', '[EMAIL_ADMIN]', 3, 1, 'admin');
