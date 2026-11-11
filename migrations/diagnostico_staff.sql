-- ============================================================
-- WoW Argentina — Diagnóstico de Staff y Rangos
-- SOLO LECTURA: este script no modifica nada.
--   mysql -u <admin> -p < migrations/diagnostico_staff.sql
-- Si una consulta da "doesn't exist", esa tabla no está en tu servidor
-- (en AzerothCore estándar las tablas rbac_* NO existen: es normal).
-- ============================================================

-- 1. ¿Qué tablas de rangos existen y con qué columnas?
SELECT TABLE_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS columnas
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'acore_auth'
  AND TABLE_NAME IN ('account_access', 'rbac_permissions', 'rbac_account_permissions', 'rbac_linked_permissions', 'rbac_default_permissions')
GROUP BY TABLE_NAME;

-- 2. Cuentas con nivel GM (esto es lo que el panel lista como Staff)
SELECT aa.id, a.username, aa.gmlevel, aa.RealmID
FROM acore_auth.account_access aa
LEFT JOIN acore_auth.account a ON a.id = aa.id
WHERE aa.gmlevel > 0
ORDER BY aa.gmlevel DESC, aa.id;

-- 3. Filas de account_access de cuentas que ya no existen (el panel las ignora)
SELECT aa.id, aa.gmlevel, aa.RealmID
FROM acore_auth.account_access aa
LEFT JOIN acore_auth.account a ON a.id = aa.id
WHERE a.id IS NULL;

-- 4. ¿Qué ve el usuario de la web? (reemplazá cms_web por DATABASE_USER)
SHOW GRANTS FOR 'cms_web'@'localhost';

-- 5. Expedientes, divisiones y movimientos del staff (después de la migración 2026_11_staff_rrhh.sql)
SELECT p.account_id, a.username, p.rank_key, p.status, p.joined_at
FROM wowargentina_cms.cms_staff_profiles p
LEFT JOIN acore_auth.account a ON a.id = p.account_id
ORDER BY p.status, p.account_id;

SELECT d.name, d.active, COUNT(m.id) AS miembros_activos
FROM wowargentina_cms.cms_staff_divisions d
LEFT JOIN wowargentina_cms.cms_staff_division_members m ON m.division_id = d.id AND m.active = 1
GROUP BY d.id ORDER BY d.id;

SELECT created_at, actor_name, action, target_name, result, reason
FROM wowargentina_cms.cms_staff_activity
ORDER BY id DESC LIMIT 30;
