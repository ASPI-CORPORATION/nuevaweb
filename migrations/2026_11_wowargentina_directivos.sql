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

-- Registro de auditoría de la migración (si la tabla de logs existe)
INSERT INTO wowargentina_cms.cms_directivos_logs (directivo_account_id, target_account_id, action, details, ip)
SELECT 1, 1, 'DIRECTIVO_BOOTSTRAP', 'Migración: cuenta ID 1 registrada como Propietario (Máxima Autoridad)', 'migracion'
FROM acore_auth.account a
WHERE a.id = 1
  AND NOT EXISTS (SELECT 1 FROM wowargentina_cms.cms_directivos_logs WHERE action = 'DIRECTIVO_BOOTSTRAP');

-- Verificación: debe mostrar la cuenta 1 como propietario activo.
-- Si no devuelve filas, la cuenta ID 1 no existe en acore_auth.account.
SELECT d.account_id, a.username, d.nombre_directivo, d.rango, d.activo, d.protegido, d.fecha_ingreso
FROM wowargentina_cms.wowargentina_directivos d
JOIN acore_auth.account a ON a.id = d.account_id
ORDER BY d.rango = 'propietario' DESC, d.account_id;

-- Rollback (solo si fuera necesario; quita el acceso web a /directivos a todos):
--   DROP TABLE wowargentina_cms.wowargentina_directivos;
