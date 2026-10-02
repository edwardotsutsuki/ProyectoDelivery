const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'db-postgis',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'delivery_admin',
  password: process.env.POSTGRES_PASSWORD || 'delivery_secure_pass_2026',
  database: process.env.POSTGRES_DB || 'delivery_db',
});

async function main() {
  const users = [
    { email: 'admin@delivery.com', pass: 'admin123' },
    { email: 'comercio@delivery.com', pass: 'comercio123' },
    { email: 'repartidor@delivery.com', pass: 'repartidor123' },
    { email: 'edward.otsutsuki@gmail.com', pass: 'cliente123' },
  ];

  console.log('🔄 Restableciendo contraseñas en PostgreSQL...');
  for (const u of users) {
    const hash = bcrypt.hashSync(u.pass, 10);
    const res = await pool.query('UPDATE usuarios SET password_hash = $1 WHERE email = $2', [hash, u.email]);
    console.log(`✅ ${u.email} -> contraseña fijada (${res.rowCount} fila actualizada)`);
  }

  await pool.end();
  console.log('✨ Todas las contraseñas de prueba han sido restablecidas exitosamente.');
}

main().catch((err) => {
  console.error('❌ Error restableciendo contraseñas:', err);
  process.exit(1);
});
