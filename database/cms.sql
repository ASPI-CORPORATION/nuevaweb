-- ==========================================
-- WoW ARGENTINA - CMS DATABASE
-- Para AzerothCore MASTER 2026 / MySQL 8.0
-- Ejecutar: mysql -u root -p < cms.sql
-- ==========================================

CREATE DATABASE IF NOT EXISTS `wowargentina_cms`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `wowargentina_cms`;

-- 1. NOTICIAS
CREATE TABLE IF NOT EXISTS `cms_news` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`        VARCHAR(255) NOT NULL,
  `title`       VARCHAR(255) NOT NULL,
  `excerpt`     VARCHAR(500) DEFAULT NULL,
  `content`     LONGTEXT NOT NULL,
  `image`       VARCHAR(500) DEFAULT '/images/news/default.jpg',
  `category`    ENUM('Eventos','Actualizaciones','PvP','PvE','General','Mantenimiento') NOT NULL DEFAULT 'General',
  `author_id`   INT UNSIGNED NOT NULL COMMENT 'account.id de acore_auth',
  `author_name` VARCHAR(50) DEFAULT NULL,
  `published`   TINYINT(1) NOT NULL DEFAULT 1,
  `pinned`      TINYINT(1) NOT NULL DEFAULT 0,
  `views`       INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug_unique` (`slug`),
  KEY `idx_published` (`published`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. CHANGELOG
CREATE TABLE IF NOT EXISTS `cms_changelog` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `version`     VARCHAR(20) NOT NULL COMMENT 'Ej: v2.1.0',
  `title`       VARCHAR(255) NOT NULL,
  `date`        DATE NOT NULL,
  `changes`     JSON NOT NULL COMMENT '[{"type":"NUEVO","text":"..."}]',
  `type`        ENUM('Mayor','Menor','Hotfix') NOT NULL DEFAULT 'Menor',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_date` (`date` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TIENDA
CREATE TABLE IF NOT EXISTS `cms_shop_items` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_entry`   INT UNSIGNED NOT NULL COMMENT 'entry de acore_world.item_template',
  `name`         VARCHAR(255) NOT NULL,
  `description`  TEXT DEFAULT NULL,
  `price_coins`  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Precio en Moneda Argentina',
  `category`     ENUM('Sets Custom','Monturas','Mascotas','Servicios','Oro','Otros') NOT NULL DEFAULT 'Otros',
  `image`        VARCHAR(500) DEFAULT NULL,
  `active`       TINYINT(1) NOT NULL DEFAULT 1,
  `stock`        INT DEFAULT -1 COMMENT '-1 = ilimitado',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`, `active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. ORDENES / COMPRAS
CREATE TABLE IF NOT EXISTS `cms_orders` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id`     INT UNSIGNED NOT NULL,
  `character_name` VARCHAR(50) DEFAULT NULL,
  `item_entry`     INT UNSIGNED NOT NULL,
  `item_name`      VARCHAR(255) NOT NULL,
  `price`          INT UNSIGNED NOT NULL,
  `status`         ENUM('Pendiente','Entregado','Reembolsado','Fallido') NOT NULL DEFAULT 'Pendiente',
  `soap_response`  TEXT DEFAULT NULL,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account` (`account_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. VOTOS
CREATE TABLE IF NOT EXISTS `cms_votes` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id`  INT UNSIGNED NOT NULL,
  `site`        ENUM('TopG','WoW-Servers','Top100Arena') NOT NULL,
  `ip`          VARCHAR(45) DEFAULT NULL,
  `rewarded`    TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_site` (`account_id`, `site`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. TICKETS
CREATE TABLE IF NOT EXISTS `cms_tickets` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id`     INT UNSIGNED NOT NULL,
  `character_name` VARCHAR(50) DEFAULT NULL,
  `category`       ENUM('Bug','Donación','Ban','Personaje Atascado','Tienda','Otro') NOT NULL DEFAULT 'Otro',
  `subject`        VARCHAR(255) NOT NULL,
  `message`        TEXT NOT NULL,
  `status`         ENUM('Abierto','En Revisión','Cerrado') NOT NULL DEFAULT 'Abierto',
  `priority`       ENUM('Baja','Media','Alta','Urgente') NOT NULL DEFAULT 'Media',
  `assigned_to`    INT UNSIGNED DEFAULT NULL COMMENT 'GM que lo atiende',
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_status` (`account_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cms_ticket_replies` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id`   INT UNSIGNED NOT NULL,
  `author_id`   INT UNSIGNED NOT NULL,
  `author_name` VARCHAR(50) DEFAULT NULL,
  `is_gm`       TINYINT(1) NOT NULL DEFAULT 0,
  `message`     TEXT NOT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket` (`ticket_id`, `created_at`),
  CONSTRAINT `fk_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `cms_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. LOGS GM
CREATE TABLE IF NOT EXISTS `cms_gm_logs` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `gm_account_id`    INT UNSIGNED NOT NULL,
  `target_account_id` INT UNSIGNED DEFAULT NULL,
  `action`           VARCHAR(100) NOT NULL,
  `details`          TEXT DEFAULT NULL,
  `ip`               VARCHAR(45) DEFAULT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gm` (`gm_account_id`, `created_at`),
  KEY `idx_action` (`action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. LOGS DIRECTIVOS (NUNCA SE BORRA)
CREATE TABLE IF NOT EXISTS `cms_directivos_logs` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `directivo_account_id` INT UNSIGNED NOT NULL,
  `target_account_id`    INT UNSIGNED DEFAULT NULL,
  `action`               VARCHAR(150) NOT NULL,
  `details`              TEXT DEFAULT NULL,
  `ip`                   VARCHAR(45) DEFAULT NULL,
  `created_at`           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_directivo` (`directivo_account_id`, `created_at`),
  KEY `idx_action` (`action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. LOGS GENERALES
CREATE TABLE IF NOT EXISTS `cms_logs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` INT UNSIGNED DEFAULT NULL,
  `action`     VARCHAR(150) NOT NULL,
  `details`    TEXT DEFAULT NULL,
  `ip`         VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account` (`account_id`, `created_at`),
  KEY `idx_action` (`action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. MONEDA ARGENTINA
CREATE TABLE IF NOT EXISTS `cms_user_coins` (
  `account_id` INT UNSIGNED NOT NULL,
  `coins`      INT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. CONFIGURACIÓN CMS
CREATE TABLE IF NOT EXISTS `cms_config` (
  `key_name`   VARCHAR(100) NOT NULL,
  `value`      TEXT DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Configuración por defecto
INSERT IGNORE INTO `cms_config` (`key_name`, `value`) VALUES
  ('maintenance_mode', '0'),
  ('motd', 'Bienvenidos a WoW Argentina - ¡Dominá Rasganorte!'),
  ('discord_url', 'https://discord.gg/wowargentina'),
  ('topg_url', 'https://topg.org/server-vote-wowargentina'),
  ('wowservers_url', 'https://www.wow-servers.eu/server-vote-wowargentina'),
  ('vote_cooldown_hours', '12'),
  ('vote_coins_reward', '1');

-- 12. CÓDIGOS PROMO
CREATE TABLE IF NOT EXISTS `cms_promo_codes` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(50) NOT NULL,
  `coins`      INT UNSIGNED NOT NULL DEFAULT 0,
  `max_uses`   INT UNSIGNED DEFAULT 1,
  `uses`       INT UNSIGNED NOT NULL DEFAULT 0,
  `active`     TINYINT(1) NOT NULL DEFAULT 1,
  `expires_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. USOS DE CÓDIGOS PROMO
CREATE TABLE IF NOT EXISTS `cms_promo_uses` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code_id`    INT UNSIGNED NOT NULL,
  `account_id` INT UNSIGNED NOT NULL,
  `coins`      INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_use` (`code_id`, `account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- Usuario CMS con permisos mínimos necesarios
-- Ejecutar como root:
-- ==========================================
-- CREATE USER 'cms_web'@'localhost' IDENTIFIED BY 'TU_PASSWORD_SEGURO';
-- GRANT SELECT, INSERT, UPDATE ON acore_auth.account TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_auth.account_access TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_auth.realmlist TO 'cms_web'@'localhost';
-- GRANT INSERT ON acore_auth.account_banned TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_characters.characters TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_characters.arena_team TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_characters.arena_team_member TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_characters.guild TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_characters.guild_member TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_world.item_template TO 'cms_web'@'localhost';
-- GRANT ALL PRIVILEGES ON wowargentina_cms.* TO 'cms_web'@'localhost';
-- FLUSH PRIVILEGES;
