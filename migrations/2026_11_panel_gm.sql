-- ============================================================
-- WoW Argentina — Panel Game Master
-- Base: wowargentina_cms. NO modifica tablas de AzerothCore (las sanciones se
-- aplican por SOAP con los comandos del core) ni wowargentina_directivos.
-- Idempotente y no destructiva: solo agrega columnas/tablas y amplía ENUMs.
-- Compatible con MySQL 8.x y MariaDB 10.x.
--
--   mysql -u <admin> -p < migrations/2026_11_panel_gm.sql
-- ============================================================

SET NAMES utf8mb4;
USE wowargentina_cms;

DROP PROCEDURE IF EXISTS wa_add_column;
DELIMITER //
CREATE PROCEDURE wa_add_column(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

-- ── 1. Tickets: nuevos estados y prioridades ────────────────────────────────
-- Estados: superconjunto de los anteriores (Abierto, En Revisión, Cerrado se conservan).
ALTER TABLE cms_tickets
  MODIFY COLUMN status ENUM('Abierto','Aceptado','En Revisión','Rechazado','Cerrado') NOT NULL DEFAULT 'Abierto';
-- Prioridad: se agrega 'Normal' (equivale a la antigua 'Media', que se conserva en el ENUM).
ALTER TABLE cms_tickets
  MODIFY COLUMN priority ENUM('Baja','Normal','Media','Alta','Urgente') NOT NULL DEFAULT 'Normal';
UPDATE cms_tickets SET priority = 'Normal' WHERE priority = 'Media';

CALL wa_add_column('cms_tickets', 'assigned_at',          'DATETIME NULL DEFAULT NULL AFTER `assigned_to`');
CALL wa_add_column('cms_tickets', 'rejected_reason',      'VARCHAR(500) NULL DEFAULT NULL');
CALL wa_add_column('cms_tickets', 'closed_at',            'DATETIME NULL DEFAULT NULL');
CALL wa_add_column('cms_tickets', 'closed_by',            'INT UNSIGNED NULL DEFAULT NULL');
CALL wa_add_column('cms_tickets', 'last_reply_at',        'DATETIME NULL DEFAULT NULL');
CALL wa_add_column('cms_tickets', 'player_seen_reply_id', 'INT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''Última respuesta vista por el jugador''');

-- Mensajes del sistema (cambios de estado) dentro del historial del ticket
CALL wa_add_column('cms_ticket_replies', 'is_system', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_gm`');

-- ── 2. Auditoría GM ampliada ────────────────────────────────────────────────
CALL wa_add_column('cms_gm_logs', 'gm_name',          'VARCHAR(50) NULL DEFAULT NULL AFTER `gm_account_id`');
CALL wa_add_column('cms_gm_logs', 'gm_tier',          'TINYINT UNSIGNED NULL DEFAULT NULL AFTER `gm_name`');
CALL wa_add_column('cms_gm_logs', 'target_character', 'VARCHAR(50) NULL DEFAULT NULL AFTER `target_account_id`');
CALL wa_add_column('cms_gm_logs', 'reason',           'VARCHAR(500) NULL DEFAULT NULL');
CALL wa_add_column('cms_gm_logs', 'result',           'VARCHAR(20) NULL DEFAULT NULL');
CALL wa_add_column('cms_gm_logs', 'reference',        'VARCHAR(100) NULL DEFAULT NULL');

DROP PROCEDURE IF EXISTS wa_add_column;

-- ── 3. Sanciones aplicadas desde el panel (AzerothCore guarda el baneo oficial;
--       esta tabla guarda qué GM lo aplicó, para auditoría y para la regla
--       "un GM nivel 2 solo revoca sanciones propias") ─────────────────────────
CREATE TABLE IF NOT EXISTS cms_gm_sanctions (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type             ENUM('ban_account','ban_character','mute') NOT NULL,
  account_id       INT UNSIGNED NOT NULL,
  account_name     VARCHAR(32)  NOT NULL,
  character_guid   INT UNSIGNED NULL DEFAULT NULL,
  character_name   VARCHAR(12)  NULL DEFAULT NULL,
  gm_account_id    INT UNSIGNED NOT NULL,
  gm_name          VARCHAR(50)  NOT NULL,
  gm_tier          TINYINT UNSIGNED NOT NULL,
  reason           VARCHAR(500) NOT NULL,
  duration_key     VARCHAR(8)   NOT NULL,
  starts_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at          DATETIME     NULL DEFAULT NULL COMMENT 'NULL = permanente',
  status           ENUM('activa','revocada') NOT NULL DEFAULT 'activa',
  revoked_by       INT UNSIGNED NULL DEFAULT NULL,
  revoked_by_name  VARCHAR(50)  NULL DEFAULT NULL,
  revoked_at       DATETIME     NULL DEFAULT NULL,
  core_output      VARCHAR(500) NULL DEFAULT NULL COMMENT 'Respuesta del worldserver',
  PRIMARY KEY (id),
  KEY idx_account (account_id, status),
  KEY idx_gm (gm_account_id, starts_at),
  KEY idx_starts (starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 4. Plantillas de respuesta (editables por GM nivel 3) ───────────────────
CREATE TABLE IF NOT EXISTS cms_gm_reply_templates (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  label       VARCHAR(40)  NOT NULL,
  body        TEXT         NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_by  INT UNSIGNED NULL DEFAULT NULL,
  updated_at  DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO cms_gm_reply_templates (label, body, sort_order)
SELECT * FROM (
  SELECT 'Saludar' AS label, '¡Hola! Soy el GM {gm.username} de WoW Argentina y hoy voy a ayudarte con tu solicitud. ¿Podrías contarme un poco más sobre el inconveniente?' AS body, 1 AS sort_order
  UNION ALL SELECT 'Solicitar información', 'Para poder ayudarte correctamente, necesito que me indiques el nombre de tu personaje y me brindes más detalles sobre el problema.', 2
  UNION ALL SELECT 'En revisión', 'Tu solicitud está siendo revisada por nuestro equipo. Te informaremos por este mismo ticket cuando tengamos novedades.', 3
  UNION ALL SELECT 'Problema solucionado', 'El inconveniente reportado ha sido solucionado. Por favor, comprobá que todo funcione correctamente.', 4
  UNION ALL SELECT 'Rechazar solicitud', 'Lamentablemente, tu solicitud no puede ser aprobada en este momento. A continuación te explicaremos el motivo.', 5
  UNION ALL SELECT 'Despedirse', 'Gracias por comunicarte con el equipo de soporte de WoW Argentina. ¡Esperamos que disfrutes tu aventura por Azeroth!', 6
  UNION ALL SELECT 'Cerrar ticket', 'Tu solicitud ha sido atendida y el ticket será cerrado. Si necesitás asistencia adicional, podés crear una nueva solicitud.', 7
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM cms_gm_reply_templates);

-- ── 5. País aproximado por cuenta (caché GeoIP; nunca se inventa) ───────────
CREATE TABLE IF NOT EXISTS cms_account_geo (
  account_id    INT UNSIGNED NOT NULL,
  ip            VARCHAR(45)  NULL DEFAULT NULL,
  country_code  CHAR(2)      NULL DEFAULT NULL COMMENT 'NULL = País desconocido',
  country_name  VARCHAR(64)  NULL DEFAULT NULL,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id),
  KEY idx_country (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 6. Historial de jugadores conectados (para el gráfico; empieza a registrar
--       desde la instalación, no hay datos previos) ─────────────────────────
CREATE TABLE IF NOT EXISTS cms_online_snapshots (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  taken_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  players    INT UNSIGNED NOT NULL,
  source     VARCHAR(16)  NOT NULL DEFAULT 'db',
  PRIMARY KEY (id),
  KEY idx_taken (taken_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'Migración del Panel GM aplicada' AS estado;

-- ── Permisos de solo lectura que necesita el usuario web (ejecutar como root) ──
-- GRANT SELECT ON acore_auth.account_banned       TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_auth.account_muted        TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_auth.ip_banned            TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_characters.character_banned TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_world.game_tele           TO 'cms_web'@'localhost';
-- Las sanciones se ejecutan por SOAP: el usuario web NO necesita escribir en AzerothCore.
