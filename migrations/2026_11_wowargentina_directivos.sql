-- ============================================================
-- WoW Argentina — Sistema propio de Directivos
-- Crea wowargentina_cms.wowargentina_directivos y registra la cuenta ID 1
-- como Propietario (Máxima Autoridad).
--
-- * NO modifica ninguna tabla de AzerothCore (solo LEE acore_auth.account).
-- * Idempotente: se puede ejecutar varias veces.
-- * No borra datos: las bajas desde el panel son lógicas (fecha_baja).
-- * El acceso web a /directivos queda desacoplado de gmlevel y de RBAC.
--
-- Ejecutar con un usuario con permisos de CREATE/INSERT en wowargentina_cms
-- y SELECT en acore_auth.account (por ejemplo el administrador de MySQL):
--   mysql -u <admin> -p < migrations/2026_11_wowargentina_directivos.sql
-- Si tus bases tienen otros nombres, reemplazá acore_auth / wowargentina_cms.
-- ============================================================

-- Los textos con acentos ('Máxima Autoridad', 'Corrección') requieren una conexión UTF-8
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS wowargentina_cms.wowargentina_directivos (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id       INT UNSIGNED NOT NULL COMMENT 'acore_auth.account.id (vínculo lógico, sin FK entre bases)',
  nombre_directivo VARCHAR(60)  NOT NULL COMMENT 'Nombre visible en el panel; no reemplaza el usuario real',
  rango            ENUM('propietario','directivo') NOT NULL DEFAULT 'directivo',
  activo           TINYINT(1)   NOT NULL DEFAULT 1,
  protegido        TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = no puede eliminarse ni desactivarse desde el panel',
  fecha_ingreso    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  agregado_por     INT UNSIGNED NULL     COMMENT 'account_id de quien lo incorporó (NULL = migración)',
  fecha_baja       DATETIME     NULL     DEFAULT NULL COMMENT 'NOT NULL = eliminado del equipo (historial conservado)',
  removido_por     INT UNSIGNED NULL     DEFAULT NULL,
  actualizado_en   DATETIME     NULL     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_account (account_id),
  KEY idx_activos (activo, fecha_baja)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Miembros con acceso al Panel de Directivos de la web (independiente de gmlevel/RBAC)';

-- Propietario inicial: solo se inserta si la cuenta ID 1 existe en AzerothCore.
INSERT INTO wowargentina_cms.wowargentina_directivos
  (account_id, nombre_directivo, rango, activo, protegido, agregado_por)
SELECT a.id, 'Máxima Autoridad', 'propietario', 1, 1, NULL
FROM acore_auth.account a
WHERE a.id = 1
ON DUPLICATE KEY UPDATE
  rango = 'propietario', activo = 1, protegido = 1, fecha_baja = NULL, removido_por = NULL;

-- Reparación: nombre guardado con acentos corruptos por un cliente latin1 en una ejecución previa
UPDATE wowargentina_cms.wowargentina_directivos
SET nombre_directivo = 'Máxima Autoridad'
WHERE account_id = 1 AND HEX(nombre_directivo) = '4DC383C2A178696D61204175746F7269646164';

-- Registro de auditoría de la migración. Se adapta a columnas extra que existan en tu
-- cms_directivos_logs (directivo_name / target_name) y nunca detiene la migración.
DROP PROCEDURE IF EXISTS wowargentina_cms.wa_log_bootstrap;
DELIMITER //
CREATE PROCEDURE wowargentina_cms.wa_log_bootstrap()
BEGIN
  DECLARE v_user VARCHAR(64) DEFAULT NULL;
  DECLARE v_cols TEXT DEFAULT 'directivo_account_id, target_account_id, action, details, ip';
  DECLARE v_vals TEXT DEFAULT NULL;
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    SELECT 'Aviso: no se pudo escribir el log de auditoría (el Propietario sí quedó registrado)' AS aviso;

  SELECT username INTO v_user FROM acore_auth.account WHERE id = 1;

  IF v_user IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM wowargentina_cms.cms_directivos_logs WHERE action = 'DIRECTIVO_BOOTSTRAP'
  ) THEN
    SET v_vals = CONCAT_WS(', ', '1', '1', QUOTE('DIRECTIVO_BOOTSTRAP'),
      QUOTE('Migración: cuenta ID 1 registrada como Propietario (Máxima Autoridad)'), QUOTE('migracion'));
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'wowargentina_cms'
               AND table_name = 'cms_directivos_logs' AND column_name = 'directivo_name') THEN
      SET v_cols = CONCAT(v_cols, ', directivo_name');
      SET v_vals = CONCAT(v_vals, ', ', QUOTE(v_user));
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'wowargentina_cms'
               AND table_name = 'cms_directivos_logs' AND column_name = 'target_name') THEN
      SET v_cols = CONCAT(v_cols, ', target_name');
      SET v_vals = CONCAT(v_vals, ', ', QUOTE(v_user));
    END IF;
    SET @wa_sql = CONCAT('INSERT INTO wowargentina_cms.cms_directivos_logs (', v_cols, ') VALUES (', v_vals, ')');
    PREPARE wa_stmt FROM @wa_sql;
    EXECUTE wa_stmt;
    DEALLOCATE PREPARE wa_stmt;
  END IF;
END //
DELIMITER ;
CALL wowargentina_cms.wa_log_bootstrap();
DROP PROCEDURE IF EXISTS wowargentina_cms.wa_log_bootstrap;

-- Verificación: debe mostrar la cuenta 1 como propietario activo.
-- Si no devuelve filas, la cuenta ID 1 no existe en acore_auth.account.
SELECT d.account_id, a.username, d.nombre_directivo, d.rango, d.activo, d.protegido, d.fecha_ingreso
FROM wowargentina_cms.wowargentina_directivos d
JOIN acore_auth.account a ON a.id = d.account_id
ORDER BY d.rango = 'propietario' DESC, d.account_id;

-- Rollback (solo si fuera necesario; quita el acceso web a /directivos a todos):
--   DROP TABLE wowargentina_cms.wowargentina_directivos;
