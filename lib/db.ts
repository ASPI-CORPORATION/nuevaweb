import mysql from 'mysql2/promise'

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
