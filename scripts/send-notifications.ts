import{loadEnvConfig}from'@next/env';
import{processOrderNotifications,configuredTransports}from'../src/lib/server/notifications';
import{getDatabase}from'../src/lib/server/database';
async function main(){loadEnvConfig(process.cwd());if(!configuredTransports().length){console.log('Notification channel is not configured.');return;}try{console.log(`Sent notifications: ${await processOrderNotifications()}`);}finally{await(await getDatabase()).close();}}
main().catch(()=>{console.error('Notification processing failed; pending notifications remain in the database.');process.exitCode=1;});
