-- ============================================================
-- WoW Argentina — Diagnóstico de acceso a /directivos
-- SOLO LECTURA: este script no modifica nada.
-- ============================================================
-- Desde migrations/2026_11_wowargentina_directivos.sql, una cuenta accede a
-- /directivos únicamente si tiene una fila en wowargentina_cms.wowargentina_directivos
-- con activo = 1 y fecha_baja IS NULL. gmlevel y RBAC NO intervienen.
-- ============================================================

-- 1. ¿Existe la tabla?
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'wowargentina_cms' AND table_name = 'wowargentina_directivos';

-- 2. ¿Existe la cuenta propietaria (ID 1) en AzerothCore?
SELECT id, username, email, last_login FROM acore_auth.account WHERE id = 1;

-- 3. Miembros actuales y su estado
SELECT d.account_id, a.username, d.nombre_directivo, d.rango, d.activo, d.protegido,
       d.fecha_ingreso, d.agregado_por, d.fecha_baja, d.removido_por
FROM wowargentina_cms.wowargentina_directivos d
LEFT JOIN acore_auth.account a ON a.id = d.account_id
ORDER BY d.rango = 'propietario' DESC, d.fecha_baja IS NOT NULL, d.account_id;

-- 4. Últimas acciones sobre el equipo de Directivos
SELECT created_at, directivo_account_id, target_account_id, action, details
FROM wowargentina_cms.cms_directivos_logs
WHERE action LIKE 'DIRECTIVO_%'
ORDER BY created_at DESC LIMIT 20;

-- Si la consulta 1 no devuelve filas: ejecutá migrations/2026_11_wowargentina_directivos.sql.
-- Si la consulta 2 no devuelve filas: la cuenta ID 1 no existe y la migración no la registra.
