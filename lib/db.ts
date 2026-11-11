import mysql from 'mysql2/promise'

// Re-export for callers that need the ResultSetHeader type
export type { ResultSetHeader } from 'mysql2'

const baseConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'cms_web',
  password: process.env.DATABASE_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
}

export const dbAuth = mysql.createPool({
  ...baseConfig,
  database: process.env.DATABASE_AUTH || 'acore_auth',
})

export const dbCharacters = mysql.createPool({
  ...baseConfig,
  database: process.env.DATABASE_CHARACTERS || 'acore_characters',
})

function sqlIdentifier(name: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Invalid database name: ${name}`)
  return `\`${name}\``
}

/** Qualified auth DB name for cross-database joins from the CMS pool (e.g. account usernames). */
export const AUTH_DB = sqlIdentifier(process.env.DATABASE_AUTH || 'acore_auth')
export const CHARACTERS_DB = sqlIdentifier(process.env.DATABASE_CHARACTERS || 'acore_characters')
export const CMS_DB = sqlIdentifier(process.env.DATABASE_CMS || 'wowargentina_cms')

/** Qualified world DB name for cross-database joins (e.g. item_template from the characters pool). */
export const WORLD_DB = sqlIdentifier(process.env.DATABASE_WORLD || 'acore_world')

export const dbWorld = mysql.createPool({
  ...baseConfig,
  database: process.env.DATABASE_WORLD || 'acore_world',
})

export const dbCms = mysql.createPool({
  ...baseConfig,
  database: process.env.DATABASE_CMS || 'wowargentina_cms',
})

export async function queryAuth<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await dbAuth.execute(sql, params as never)
  return rows as T[]
}

export async function queryCharacters<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await dbCharacters.execute(sql, params as never)
  return rows as T[]
}

export async function queryWorld<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await dbWorld.execute(sql, params as never)
  return rows as T[]
}

export async function queryCms<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await dbCms.execute(sql, params as never)
  return rows as T[]
}

export async function queryCmsFirst<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await queryCms<T>(sql, params)
  return rows[0] ?? null
}

export async function queryAuthFirst<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await queryAuth<T>(sql, params)
  return rows[0] ?? null
}

export async function queryCharactersFirst<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await queryCharacters<T>(sql, params)
  return rows[0] ?? null
}

/**
 * Executes an INSERT / UPDATE / DELETE against the auth DB and returns the ResultSetHeader.
 * Use this instead of queryAuth() for mutation statements — queryAuth() already extracts
 * the first element of mysql2's tuple, so the returned value is a plain ResultSetHeader
 * object (not an array) and cannot be destructured as `const [result] = ...`.
 */
export async function executeAuth(sql: string, params?: unknown[]): Promise<mysql.ResultSetHeader> {
  const [result] = await dbAuth.execute(sql, params as never)
  return result as mysql.ResultSetHeader
}

export async function executeCharacters(sql: string, params?: unknown[]): Promise<mysql.ResultSetHeader> {
  const [result] = await dbCharacters.execute(sql, params as never)
  return result as mysql.ResultSetHeader
}

export async function executeCms(sql: string, params?: unknown[]): Promise<mysql.ResultSetHeader> {
  const [result] = await dbCms.execute(sql, params as never)
  return result as mysql.ResultSetHeader
}

/**
 * Runs `fn` inside an acore_auth transaction.
 * Automatically commits on success and rolls back on error.
 */
export async function withAuthTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await dbAuth.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
