-- ============================================================
-- WoW Argentina — Changelog con imágenes, categorías y borradores
-- Base: wowargentina_cms (NO toca las bases de AzerothCore)
-- Idempotente: se puede ejecutar varias veces. Solo AGREGA columnas;
-- no borra ni modifica registros existentes.
-- Compatible con MySQL 8.x y MariaDB 10.x.
-- ============================================================

-- Los textos con acentos ('Máxima Autoridad', 'Corrección') requieren una conexión UTF-8
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

-- Imagen de portada (ruta /api/uploads/<uuid>.<ext> o URL https)
CALL wa_add_column('cms_changelog', 'image', 'VARCHAR(500) NULL DEFAULT NULL AFTER `title`');
-- Resumen corto para las tarjetas
CALL wa_add_column('cms_changelog', 'summary', 'VARCHAR(500) NULL DEFAULT NULL AFTER `image`');
-- Contenido enriquecido opcional (HTML sanitizado, admite imágenes)
CALL wa_add_column('cms_changelog', 'content', 'LONGTEXT NULL AFTER `summary`');
-- Categoría principal de la actualización
CALL wa_add_column('cms_changelog', 'category', "ENUM('Nuevo','Corrección','Balance','Evento') NOT NULL DEFAULT 'Nuevo' AFTER `type`");
-- Borradores: los registros existentes quedan publicados (DEFAULT 1)
CALL wa_add_column('cms_changelog', 'published', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `category`');
CALL wa_add_column('cms_changelog', 'author_name', 'VARCHAR(50) NULL DEFAULT NULL AFTER `published`');
CALL wa_add_column('cms_changelog', 'updated_at', 'DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');

DROP PROCEDURE IF EXISTS wa_add_column;

-- Reparación: si una ejecución anterior se hizo con el cliente en latin1, el ENUM quedó
-- como 'CorrecciÃ³n' y la web no podía guardar esa categoría. Ninguna fila pudo
-- guardarse con ese valor, así que redefinir el ENUM no altera datos.
DROP PROCEDURE IF EXISTS wa_fix_category_enum;
DELIMITER //
CREATE PROCEDURE wa_fix_category_enum()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'cms_changelog' AND column_name = 'category'
      AND column_type <> 'enum(''Nuevo'',''Corrección'',''Balance'',''Evento'')'
  ) THEN
    ALTER TABLE cms_changelog
      MODIFY COLUMN category ENUM('Nuevo','Corrección','Balance','Evento') NOT NULL DEFAULT 'Nuevo';
  END IF;
END //
DELIMITER ;
CALL wa_fix_category_enum();
DROP PROCEDURE IF EXISTS wa_fix_category_enum;

-- Discord oficial (configuración, no contenido histórico)
UPDATE cms_config SET value = 'https://discord.gg/9KmrAPJzjn'
WHERE key_name = 'discord_url' AND (value IS NULL OR value <> 'https://discord.gg/9KmrAPJzjn');
INSERT IGNORE INTO cms_config (key_name, value) VALUES ('discord_url', 'https://discord.gg/9KmrAPJzjn');

-- Verificación
SELECT column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'cms_changelog'
ORDER BY ordinal_position;

-- ── Rollback (solo si fuera necesario; borra los datos de estas columnas) ──
-- ALTER TABLE cms_changelog
--   DROP COLUMN image, DROP COLUMN summary, DROP COLUMN content,
--   DROP COLUMN category, DROP COLUMN published, DROP COLUMN author_name, DROP COLUMN updated_at;
