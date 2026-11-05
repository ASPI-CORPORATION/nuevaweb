-- ============================================================
-- WoW Argentina — RBAC Staff Setup Migration
-- Fecha: 2026-11-05
-- Propósito: Insertar los 10 rangos personalizados en
--   acore_auth.rbac_permissions (si no existen) y crear la
--   tabla de historial en la base del CMS.
-- ============================================================
-- Ejecutar como usuario con permisos de escritura en acore_auth y wowargentina_cms.
-- Es idempotente: puede ejecutarse varias veces sin errores.
-- ============================================================

-- ── 1. Rangos personalizados en rbac_permissions ─────────────────────────────
-- (Si ya existen desde la DB de producción, esta sección es no-op por INSERT IGNORE)

INSERT IGNORE INTO acore_auth.rbac_permissions (id, name) VALUES
  (90000, 'WoW Argentina: Ayudante'),
  (90001, 'WoW Argentina: Moderador'),
  (90002, 'WoW Argentina: Game Master'),
  (90003, 'WoW Argentina: GM Senior'),
  (90004, 'WoW Argentina: Supervisor GM'),
  (90005, 'WoW Argentina: Head GM'),
  (90006, 'WoW Argentina: Developer'),
  (90007, 'WoW Argentina: Administrador'),
  (90008, 'WoW Argentina: Co-Owner'),
  (90009, 'WoW Argentina: Owner');

-- ── 2. Verificar que se insertaron ───────────────────────────────────────────

SELECT id, name FROM acore_auth.rbac_permissions WHERE id BETWEEN 90000 AND 90009 ORDER BY id;

-- ── 3. Asignar el primer Owner (EJECUTAR MANUALMENTE solo la primera vez) ─────
-- Reemplazá <ACCOUNT_ID> con el ID real de tu cuenta principal.
-- Después de ejecutarlo, podés asignar el resto de los rangos desde el panel.
--
-- INSERT INTO acore_auth.rbac_account_permissions (id, permission, granted, realm_id)
-- VALUES (<ACCOUNT_ID>, 90009, 1, -1)
-- ON DUPLICATE KEY UPDATE granted = 1;

-- ── 4. Tabla de historial RBAC en la DB del CMS ──────────────────────────────
-- Nota: cms_directivos_logs ya almacena las acciones RBAC en texto libre.
-- Esta tabla adicional permite consultas estructuradas (rango anterior, nuevo, etc.)

CREATE TABLE IF NOT EXISTS wowargentina_cms.cms_staff_rank_history (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_account_id   INT UNSIGNED NOT NULL COMMENT 'Quien realizó el cambio',
  target_account_id  INT UNSIGNED NOT NULL COMMENT 'Cuenta modificada',
  old_rbac_rank_id   INT          DEFAULT NULL COMMENT 'Rango RBAC anterior (NULL = sin rango)',
  new_rbac_rank_id   INT          DEFAULT NULL COMMENT 'Rango RBAC nuevo (NULL = retirado)',
  old_rbac_name      VARCHAR(50)  DEFAULT NULL,
  new_rbac_name      VARCHAR(50)  DEFAULT NULL,
  reason             VARCHAR(300) NOT NULL DEFAULT '',
  operation          ENUM('assign_rank','remove_rank','change_rank') NOT NULL,
  ip                 VARCHAR(45)  NOT NULL DEFAULT '',
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin   (admin_account_id),
  KEY idx_target  (target_account_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Historial estructurado de cambios de rangos RBAC personalizados';

-- ── 5. Revertir (rollback) ────────────────────────────────────────────────────
-- Para revertir solo el historial CMS (no toca acore_auth):
--   DROP TABLE IF EXISTS wowargentina_cms.cms_staff_rank_history;
--
-- Para revertir la tabla de historial Y los rangos RBAC:
--   DROP TABLE IF EXISTS wowargentina_cms.cms_staff_rank_history;
--   DELETE FROM acore_auth.rbac_account_permissions WHERE permission BETWEEN 90000 AND 90009;
--   DELETE FROM acore_auth.rbac_permissions WHERE id BETWEEN 90000 AND 90009;
--
-- NUNCA borrar cms_directivos_logs (política de no-eliminación de logs).

SELECT 'Migración completada' AS status;
