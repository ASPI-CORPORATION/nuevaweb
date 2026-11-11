-- ============================================================
-- WoW Argentina — Staff y Rangos: expedientes, divisiones, advertencias,
-- suspensiones e historial (gestión interna del Panel de Directivos)
--
-- Base: wowargentina_cms. NO crea ni modifica tablas de AzerothCore ni
-- wowargentina_directivos. Las cuentas se referencian por acore_auth.account.id
-- (vínculo lógico: no hay FK entre bases para no alterar el funcionamiento del core).
--
-- Reutiliza cms_staff_rank_history (creada por rbac_staff_setup.sql) si ya existe:
-- solo le agrega columnas. Idempotente y no destructiva. MySQL 8.x / MariaDB 10.x.
--
--   mysql -u <admin> -p < migrations/2026_11_staff_rrhh.sql
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

-- ── 1. Expediente del miembro ───────────────────────────────────────────────
-- rank_key: rango interno de WoW Argentina (ayudante … owner). Es la fuente del
-- rango cuando el servidor no tiene tablas RBAC (AzerothCore estándar).
-- El estado "suspendido" NO se guarda acá: se calcula desde cms_staff_suspensions.
CREATE TABLE IF NOT EXISTS cms_staff_profiles (
  account_id      INT UNSIGNED NOT NULL COMMENT 'acore_auth.account.id',
  rank_key        VARCHAR(20)  NULL DEFAULT NULL COMMENT 'Rango interno vigente (NULL = sin rango)',
  status          ENUM('activo','retirado') NOT NULL DEFAULT 'activo',
  joined_at       DATETIME     NULL DEFAULT NULL COMMENT 'NULL = ingresó antes del sistema de expedientes',
  joined_by       INT UNSIGNED NULL DEFAULT NULL,
  retired_at      DATETIME     NULL DEFAULT NULL,
  retired_by      INT UNSIGNED NULL DEFAULT NULL,
  retire_reason   VARCHAR(300) NULL DEFAULT NULL,
  notes           TEXT         NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id),
  KEY idx_status (status),
  KEY idx_joined (joined_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Expediente administrativo del staff (no otorga permisos)';

-- ── 2. Divisiones internas ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_staff_divisions (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(40)  NOT NULL,
  name         VARCHAR(60)  NOT NULL,
  description  VARCHAR(300) NOT NULL DEFAULT '',
  color        CHAR(7)      NOT NULL DEFAULT '#74ACDF',
  active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED NULL DEFAULT NULL COMMENT 'NULL = creada por la migración',
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_slug (slug),
  UNIQUE KEY uq_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Divisiones administrativas (no otorgan permisos RBAC ni de juego)';

-- Las asignaciones nunca se borran: al quitar a alguien se marca active = 0.
-- active_account solo vale account_id mientras la asignación está activa, así la
-- restricción única impide duplicar a la misma persona en la misma división.
CREATE TABLE IF NOT EXISTS cms_staff_division_members (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  division_id     INT UNSIGNED NOT NULL,
  account_id      INT UNSIGNED NOT NULL COMMENT 'acore_auth.account.id',
  role            ENUM('responsable','subresponsable','supervisor','miembro','en_formacion') NOT NULL DEFAULT 'miembro',
  reason          VARCHAR(300) NOT NULL DEFAULT '',
  assigned_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by     INT UNSIGNED NOT NULL,
  active          TINYINT(1)   NOT NULL DEFAULT 1,
  removed_at      DATETIME     NULL DEFAULT NULL,
  removed_by      INT UNSIGNED NULL DEFAULT NULL,
  removed_reason  VARCHAR(300) NULL DEFAULT NULL,
  active_account  INT UNSIGNED AS (IF(active = 1, account_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_active_member (division_id, active_account),
  KEY idx_account (account_id, active),
  CONSTRAINT fk_division_member FOREIGN KEY (division_id) REFERENCES cms_staff_divisions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Asignaciones a divisiones con historial';

-- ── 3. Advertencias ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_staff_warnings (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id         INT UNSIGNED NOT NULL,
  type               ENUM('verbal','escrita','grave','final') NOT NULL,
  reason             VARCHAR(200) NOT NULL,
  description        TEXT         NULL,
  issued_by          INT UNSIGNED NOT NULL,
  issued_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status             ENUM('vigente','revisada','apelada','anulada') NOT NULL DEFAULT 'vigente',
  status_changed_by  INT UNSIGNED NULL DEFAULT NULL,
  status_changed_at  DATETIME     NULL DEFAULT NULL,
  status_note        VARCHAR(300) NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_account (account_id, status),
  KEY idx_issued (issued_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Advertencias al staff (sin suspensión automática)';

-- ── 4. Suspensiones ─────────────────────────────────────────────────────────
-- scope = 'interna': bloquea las herramientas web del Panel GM; no toca el juego.
-- scope = 'juego'  : además revoca gmlevel/RBAC; se guardan los valores previos y
--                    NUNCA se restauran solos (un Directivo debe confirmarlo).
CREATE TABLE IF NOT EXISTS cms_staff_suspensions (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id       INT UNSIGNED NOT NULL,
  scope            ENUM('interna','juego') NOT NULL,
  starts_at        DATETIME     NOT NULL,
  ends_at          DATETIME     NOT NULL,
  reason           VARCHAR(300) NOT NULL,
  notes            TEXT         NULL,
  status           ENUM('vigente','levantada') NOT NULL DEFAULT 'vigente',
  created_by       INT UNSIGNED NOT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lifted_by        INT UNSIGNED NULL DEFAULT NULL,
  lifted_at        DATETIME     NULL DEFAULT NULL,
  lift_reason      VARCHAR(300) NULL DEFAULT NULL,
  prev_rank_key    VARCHAR(20)  NULL DEFAULT NULL,
  prev_gmlevel     TINYINT UNSIGNED NULL DEFAULT NULL,
  prev_rbac_rank   INT UNSIGNED NULL DEFAULT NULL,
  restored_by      INT UNSIGNED NULL DEFAULT NULL,
  restored_at      DATETIME     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_account (account_id, status),
  KEY idx_window (starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Suspensiones del staff';

-- ── 5. Historial de rangos (reutiliza la tabla existente) ───────────────────
CREATE TABLE IF NOT EXISTS cms_staff_rank_history (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_account_id   INT UNSIGNED NOT NULL COMMENT 'Quien realizó el cambio',
  target_account_id  INT UNSIGNED NOT NULL COMMENT 'Cuenta modificada',
  old_rbac_rank_id   INT          DEFAULT NULL,
  new_rbac_rank_id   INT          DEFAULT NULL,
  old_rbac_name      VARCHAR(50)  DEFAULT NULL,
  new_rbac_name      VARCHAR(50)  DEFAULT NULL,
  reason             VARCHAR(300) NOT NULL DEFAULT '',
  operation          VARCHAR(20)  NOT NULL,
  ip                 VARCHAR(45)  NOT NULL DEFAULT '',
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin   (admin_account_id),
  KEY idx_target  (target_account_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- ENUM antiguo → VARCHAR (conserva los valores existentes) para nuevas operaciones.
ALTER TABLE cms_staff_rank_history MODIFY COLUMN operation VARCHAR(20) NOT NULL;
CALL wa_add_column('cms_staff_rank_history', 'old_rank_key', 'VARCHAR(20) NULL DEFAULT NULL');
CALL wa_add_column('cms_staff_rank_history', 'new_rank_key', 'VARCHAR(20) NULL DEFAULT NULL');
CALL wa_add_column('cms_staff_rank_history', 'old_gmlevel',  'TINYINT UNSIGNED NULL DEFAULT NULL');
CALL wa_add_column('cms_staff_rank_history', 'new_gmlevel',  'TINYINT UNSIGNED NULL DEFAULT NULL');
CALL wa_add_column('cms_staff_rank_history', 'result',       "VARCHAR(20) NOT NULL DEFAULT 'ok'");

-- ── 6. Historial del staff (solo inserción) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_staff_activity (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  target_account_id  INT UNSIGNED NULL DEFAULT NULL,
  target_name        VARCHAR(32)  NULL DEFAULT NULL,
  actor_account_id   INT UNSIGNED NOT NULL,
  actor_name         VARCHAR(32)  NOT NULL,
  action             VARCHAR(40)  NOT NULL,
  reason             VARCHAR(300) NULL DEFAULT NULL,
  details            VARCHAR(1000) NULL DEFAULT NULL,
  result             ENUM('ok','error','denegado') NOT NULL DEFAULT 'ok',
  reference          VARCHAR(60)  NULL DEFAULT NULL,
  ip                 VARCHAR(45)  NOT NULL DEFAULT '',
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_target  (target_account_id, created_at),
  KEY idx_actor   (actor_account_id),
  KEY idx_action  (action),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Historial administrativo del staff — inmutable';

-- Los historiales no pueden modificarse ni borrarse (ni desde la web ni a mano).
DROP TRIGGER IF EXISTS trg_staff_activity_no_update;
DROP TRIGGER IF EXISTS trg_staff_activity_no_delete;
DROP TRIGGER IF EXISTS trg_staff_rank_history_no_update;
DROP TRIGGER IF EXISTS trg_staff_rank_history_no_delete;
DELIMITER //
CREATE TRIGGER trg_staff_activity_no_update BEFORE UPDATE ON cms_staff_activity FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'cms_staff_activity es de solo inserción' //
CREATE TRIGGER trg_staff_activity_no_delete BEFORE DELETE ON cms_staff_activity FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'cms_staff_activity es de solo inserción' //
CREATE TRIGGER trg_staff_rank_history_no_update BEFORE UPDATE ON cms_staff_rank_history FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'cms_staff_rank_history es de solo inserción' //
CREATE TRIGGER trg_staff_rank_history_no_delete BEFORE DELETE ON cms_staff_rank_history FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'cms_staff_rank_history es de solo inserción' //
DELIMITER ;

-- ── 7. Divisiones iniciales (solo si no existen) ────────────────────────────
INSERT IGNORE INTO cms_staff_divisions (slug, name, description, color) VALUES
  ('soporte',             'Soporte al Jugador',        'Atienden consultas, tickets y problemas generales de los jugadores.', '#74ACDF'),
  ('eventos',             'Eventos',                   'Organizan y coordinan los eventos dentro del servidor.', '#F6B40E'),
  ('supervision-staff',   'Supervisión de Staff',      'Supervisan la actividad de otros Game Masters.', '#a78bfa'),
  ('supervision-nuevos',  'Supervisión de Nuevos GM',  'Acompañan, evalúan y capacitan a los Game Masters recién incorporados.', '#34d399'),
  ('moderacion',          'Moderación',                'Controlan el cumplimiento de las normas del servidor.', '#f87171'),
  ('hermandades',         'Hermandades',               'Atienden solicitudes y problemas relacionados con hermandades.', '#fb923c'),
  ('control-calidad',     'Control de Calidad',        'Prueban funciones, detectan errores y los reportan.', '#22d3ee'),
  ('desarrollo',          'Desarrollo',                'División interna para colaboradores técnicos autorizados.', '#f472b6'),
  ('administracion',      'Administración General',    'Coordinación administrativa del staff.', '#FFFFFF');

DROP PROCEDURE IF EXISTS wa_add_column;

-- ── 8. Permisos del usuario de la web (ejecutar como administrador) ─────────
-- Lectura de rangos (si el servidor tiene tablas RBAC; en AzerothCore estándar no existen):
-- GRANT SELECT ON acore_auth.rbac_permissions        TO 'cms_web'@'localhost';
-- GRANT SELECT ON acore_auth.rbac_linked_permissions TO 'cms_web'@'localhost';
-- Escritura de rangos (ascensos, degradaciones, retiros y suspensiones en el juego):
-- GRANT SELECT, INSERT, DELETE ON acore_auth.account_access           TO 'cms_web'@'localhost';
-- GRANT SELECT, INSERT, DELETE ON acore_auth.rbac_account_permissions TO 'cms_web'@'localhost';
-- (cambiá 'cms_web'@'localhost' por el usuario real de DATABASE_USER)

SELECT 'Migración de Staff completada' AS status;
