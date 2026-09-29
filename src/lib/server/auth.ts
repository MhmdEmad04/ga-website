import { randomBytes, randomUUID, scrypt, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getDatabase } from './database';
import { StoreError } from './validation';
const derive = promisify(scrypt);
export const sessionCookie = 'garbalia_admin';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password,salt,64) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, expected] = hash.split(':');
  if (!salt || !expected) return false;
  const actual = await derive(password,salt,64) as Buffer;
  const stored = Buffer.from(expected,'hex');
  return actual.length === stored.length && timingSafeEqual(actual,stored);
}
export async function createAdmin(email: string, password: string) {
  if (password.length < 14 || password.length > 200) throw new Error('Admin password must be 14–200 characters.');
  await (await getDatabase()).query('INSERT INTO garbalia.admins (id,email,password_hash) VALUES ($1,$2,$3)',[randomUUID(),email.trim().toLowerCase(),await hashPassword(password)]);
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const db = await getDatabase();
  const result = await db.query<{ count: number }>("INSERT INTO garbalia.rate_limits (key,count,expires_at) VALUES ($1,1,now()+($2 * interval '1 second')) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN garbalia.rate_limits.expires_at<now() THEN 1 ELSE garbalia.rate_limits.count+1 END, expires_at=CASE WHEN garbalia.rate_limits.expires_at<now() THEN now()+($2 * interval '1 second') ELSE garbalia.rate_limits.expires_at END RETURNING count",[digest(key),seconds]);
  if (result.rows[0].count > limit) throw new StoreError('محاولات كتير في وقت قصير. جرّب تاني بعد شوية.',429);
}
export async function login(email: string, password: string) {
  const db = await getDatabase();
  const user = (await db.query<{ id: string; password_hash: string }>('SELECT id,password_hash FROM garbalia.admins WHERE email=$1',[email.toLowerCase().trim()])).rows[0];
  // Do the same expensive derivation when the account is absent.
  const fallback = '00000000000000000000000000000000:'+'0'.repeat(128);
  const valid = await verifyPassword(password,user?.password_hash || fallback);
  if (!user || !valid) throw new StoreError('البريد أو كلمة المرور غير صحيحة.',401);
  const token = randomBytes(32).toString('hex');
  await db.query("DELETE FROM garbalia.sessions WHERE expires_at<now()");
  await db.query("INSERT INTO garbalia.sessions (token_hash,admin_id,expires_at) VALUES ($1,$2,now()+interval '8 hours')",[digest(token),user.id]);
  return token;
}
export async function findSession(token: string | undefined) {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return (await (await getDatabase()).query<{ id: string; email: string }>('SELECT a.id,a.email FROM garbalia.sessions s JOIN garbalia.admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now()',[digest(token)])).rows[0] || null;
}
export async function logout(token: string) { await (await getDatabase()).query('DELETE FROM garbalia.sessions WHERE token_hash=$1',[digest(token)]); }
