import { readFile, mkdir, chmod, readdir } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';

export interface Queryable { query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> }
export interface Database extends Queryable { transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>; close(): Promise<void> }
const state = globalThis as typeof globalThis & { garbaliaDatabase?: Promise<Database> };

export async function prepareDataDirectory(dataDir: string) {
  await mkdir(dataDir,{recursive:true});
  if(process.platform!=='win32')return;
  // OneDrive marks directories readonly. PGlite's virtual filesystem interprets
  // that flag as denied write access, even though native Windows permits writes.
  // Normalize directory flags only inside this explicitly configured database.
  await chmod(dataDir,0o700);
  for(const entry of await readdir(dataDir,{withFileTypes:true}))if(entry.isDirectory()&&!entry.isSymbolicLink())await prepareDataDirectory(path.join(dataDir,entry.name));
}

export async function migrate(db: Queryable) {
  const directory=path.join(process.cwd(),'database');
  const migrations=(await readdir(directory)).filter((name)=>/^\d+-[a-z-]+\.sql$/.test(name)).sort();
  for(const name of migrations){
    const sql=await readFile(path.join(directory,name),'utf8');
    // Idempotent migration statements contain no user input.
    for(const statement of sql.split(';').map((value)=>value.trim()).filter(Boolean))await db.query(statement);
  }
}

export async function getDatabase(): Promise<Database> {
  if (!state.garbaliaDatabase) state.garbaliaDatabase = connect().catch((error) => { state.garbaliaDatabase = undefined; throw error; });
  return state.garbaliaDatabase;
}

async function connect(): Promise<Database> {
  if (process.env.DATABASE_URL) {
    const client = postgres(process.env.DATABASE_URL, { max: 5, prepare: false, ssl: 'require' });
    const adapt = (connection: typeof client | postgres.TransactionSql): Queryable => ({ query: async <T>(sql: string, params: unknown[] = []) => ({ rows: await connection.unsafe(sql, params as postgres.ParameterOrJSON<never>[]) as unknown as T[] }) });
    return { ...adapt(client), transaction: async <T>(work: (tx: Queryable) => Promise<T>) => await client.begin((tx) => work(adapt(tx))) as T, close: () => client.end() };
  }
  if (process.env.GARBALIA_LOCAL_DATABASE !== '1') throw new Error('Configure DATABASE_URL or run npm run setup:local.');
  const dataDir=path.resolve(/* turbopackIgnore: true */ process.env.GARBALIA_DATA_DIR || '.data/store');
  await prepareDataDirectory(dataDir);
  const db = await PGlite.create(dataDir);
  return { query: (sql, params) => db.query(sql, params), transaction: (work) => db.transaction(work), close: () => db.close() };
}
