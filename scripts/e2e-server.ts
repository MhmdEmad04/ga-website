import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
async function main(){
  const directory=path.resolve(`.cache/e2e-${randomUUID()}`);mkdirSync(directory,{recursive:true});
  const env={...process.env,DATABASE_URL:'',GARBALIA_LOCAL_DATABASE:'1',GARBALIA_DATA_DIR:path.join(directory,'database'),APP_URL:'http://127.0.0.1:3001',ADMIN_EMAIL:'e2e@garbalia.local',ADMIN_PASSWORD:'E2e-private-test-password-2026',ADMIN_CREDENTIALS_FILE:path.join(directory,'admin.txt'),ORDER_NOTIFICATION_CHANNELS:'telegram',TELEGRAM_BOT_TOKEN:'',TELEGRAM_CHAT_ID:''};
  const setup=spawn(process.execPath,['--import','tsx','scripts/setup-local.ts'],{env,stdio:'inherit',windowsHide:true});
  await new Promise<void>((resolve,reject)=>{setup.on('error',reject);setup.on('exit',(code)=>code===0?resolve():reject(new Error('Test setup failed')));});
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3001'],{env,stdio:'inherit',windowsHide:true});
  process.on('SIGINT',()=>server.kill());process.on('SIGTERM',()=>server.kill());
  server.on('exit',(code)=>{process.exitCode=code || 0;});
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
