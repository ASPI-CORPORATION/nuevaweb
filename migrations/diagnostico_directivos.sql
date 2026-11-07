-- ============================================================
-- WoW Argentina — Diagnóstico de acceso a /directivos
-- SOLO LECTURA: este script no modifica nada.
-- Ejecutar con un usuario que pueda leer acore_auth.
-- ============================================================
-- La web considera Directivo a una cuenta si cumple AL MENOS UNA condición:
--   A) acore_auth.account_access.gmlevel >= 10 (convención heredada de la web)
--   B) Rango RBAC 90008 (Co-Owner) o 90009 (Owner) en rbac_account_permissions,
--      con granted = 1, realm_id -1 o el REALM_ID configurado, y el permiso
--      registrado en rbac_permissions
--   C) Su ID está en DIRECTIVOS_ACCOUNT_IDS (.env del servidor web)
-- Reemplazá 'TU_USUARIO' por el nombre de tu cuenta.
-- ============================================================

-- 1. Cuenta e ID
SELECT id, username, email, last_login, locked
FROM acore_auth.account
WHERE username = UPPER('TU_USUARIO');

-- 2. Niveles de GM nativos (AzerothCore: 0 jugador, 1 moderador, 2 GM, 3 admin, 4 consola)
SELECT aa.id, a.username, aa.gmlevel, aa.RealmID
FROM acore_auth.account_access aa
JOIN acore_auth.account a ON a.id = aa.id
WHERE a.username = UPPER('TU_USUARIO');

-- 3. ¿Existen las tablas RBAC en este servidor?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'acore_auth'
  AND table_name IN ('rbac_permissions', 'rbac_account_permissions');

-- 4. ¿Están registrados los rangos personalizados 90000–90009?
SELECT id, name FROM acore_auth.rbac_permissions WHERE id BETWEEN 90000 AND 90009 ORDER BY id;

-- 5. Rangos RBAC asignados a tu cuenta
SELECT rap.id AS account_id, a.username, rap.permission, rp.name, rap.granted, rap.realm_id
FROM acore_auth.rbac_account_permissions rap
JOIN acore_auth.account a ON a.id = rap.id
LEFT JOIN acore_auth.rbac_permissions rp ON rp.id = rap.permission
WHERE a.username = UPPER('TU_USUARIO');

-- 6. Todas las cuentas que la web reconocería como Directivo (A o B)
SELECT a.id, a.username,
       MAX(aa.gmlevel) AS gmlevel,
       MAX(CASE WHEN rap.permission IN (90008, 90009) AND rap.granted = 1 AND rp.id IS NOT NULL
                THEN rap.permission END) AS rango_rbac
FROM acore_auth.account a
LEFT JOIN acore_auth.account_access aa ON aa.id = a.id
LEFT JOIN acore_auth.rbac_account_permissions rap ON rap.id = a.id
LEFT JOIN acore_auth.rbac_permissions rp ON rp.id = rap.permission
GROUP BY a.id, a.username
HAVING gmlevel >= 10 OR rango_rbac IS NOT NULL;

-- ============================================================
-- CÓMO RECUPERAR EL ACCESO (elegí UNA opción, después de revisar lo anterior)
-- ============================================================
-- Opción 1 (sin tocar la base, recomendada para recuperar acceso ya):
--   En el .env del servidor web: DIRECTIVOS_ACCOUNT_IDS=<tu account id>
--   Reiniciá la web. Luego asigná tu rango Owner desde /directivos/staff
--   y podés quitar la variable.
--
-- Opción 2 (RBAC; requiere que la consulta 4 devuelva 90009):
--   INSERT INTO acore_auth.rbac_account_permissions (id, permission, granted, realm_id)
--   VALUES (<tu account id>, 90009, 1, -1)
--   ON DUPLICATE KEY UPDATE granted = 1;
--
-- Opción 3 (convención anterior de la web): mantener gmlevel 10 en account_access.
--   Nota: 10 no es un nivel nativo de AzerothCore; dentro del juego conviene
--   usar 3 y dejar la autoridad web en el rango RBAC (opción 2).
