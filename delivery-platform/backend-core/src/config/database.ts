import { Pool } from 'pg';

export const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'db-postgis',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'delivery_admin',
  password: process.env.POSTGRES_PASSWORD || 'delivery_secure_pass_2026',
  database: process.env.POSTGRES_DB || 'delivery_db',
  max: 20,
  idleTimeoutMillis: 30000,
});

pgPool.on('error', (err) => {
  console.error('Error inesperado en cliente de PostgreSQL:', err);
});
