import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import { getDatabase, migrate } from '../src/lib/server/database';
import { createAdmin } from '../src/lib/server/auth';
import { products, categories } from '../src/lib/catalog';

async function main() {
loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL && process.env.GARBALIA_LOCAL_DATABASE !== '1') {
  if (existsSync('.env.local')) throw new Error('Set GARBALIA_LOCAL_DATABASE=1 in .env.local to enable the local database.');
  writeFileSync('.env.local','GARBALIA_LOCAL_DATABASE=1\nAPP_URL=http://127.0.0.1:3000\n');
  process.env.GARBALIA_LOCAL_DATABASE='1';
}
const db = await getDatabase();
await migrate(db);
await db.transaction(async (tx) => {
  for (const category of categories.filter((name) => name !== 'الكل')) await tx.query('INSERT INTO garbalia.categories (name) VALUES ($1) ON CONFLICT DO NOTHING',[category]);
  // Seed once; never overwrite edited products, orders, or stock on later runs.
  if (!(await tx.query('SELECT id FROM garbalia.products LIMIT 1')).rows.length) for (const p of products) {
    await tx.query('INSERT INTO garbalia.products (id,slug,name,subtitle,description,features,category,price,default_color) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[p.id,p.slug,p.name,p.subtitle,p.description,JSON.stringify(p.features),p.category,p.price,p.defaultColor]);
    for (const color of ['black','beige','camel'] as const) await tx.query('INSERT INTO garbalia.variants (product_id,color,stock,image) VALUES ($1,$2,$3,$4)',[p.id,color,p.stock[color],p.images[color]]);
  }
});
if (!(await db.query('SELECT id FROM garbalia.admins LIMIT 1')).rows.length) {
  const password=process.env.ADMIN_PASSWORD || randomBytes(20).toString('base64url');
  const email=process.env.ADMIN_EMAIL || 'admin@garbalia.local';
  await createAdmin(email,password);
  writeFileSync(process.env.ADMIN_CREDENTIALS_FILE || '.local-admin.txt',`Garbalia local admin\nURL: ${process.env.APP_URL || 'http://127.0.0.1:3000'}/admin/login\nEmail: ${email}\nPassword: ${password}\nKeep this file private. It is excluded from version control.\n`);
  console.log('Admin created. Credentials saved to the private local credentials file.');
}
await db.close();
console.log('Database ready. Existing records preserved.');
}
main().catch((error) => { console.error(error); process.exitCode=1; });
