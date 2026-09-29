import{loadEnvConfig}from'@next/env';
async function main(){
  loadEnvConfig(process.cwd());const token=process.env.TELEGRAM_BOT_TOKEN?.trim();
  if(!token||!/^\d+:[A-Za-z0-9_-]+$/.test(token))throw Error('Set TELEGRAM_BOT_TOKEN in .env.local first.');
  const response=await fetch(`https://api.telegram.org/bot${token}/getUpdates`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({allowed_updates:['message'],timeout:0}),signal:AbortSignal.timeout(15000),redirect:'error'});
  const data=await response.json();if(!response.ok||!data.ok)throw Error('Telegram did not accept the request. Check the token and whether this bot already uses a webhook.');
  const ids=new Set<string>();for(const update of data.result||[]){const message=update.message;if(message?.chat?.type==='private'&&message.text==='/start garbalia')ids.add(String(message.chat.id));}
  if(!ids.size){console.log('Open your bot in Telegram, send /start garbalia, then run this command again.');return;}
  console.log('Private chats that sent /start garbalia:');for(const id of ids)console.log(`TELEGRAM_CHAT_ID=${id}`);
  if(ids.size>1)console.log('Multiple chats found. Choose only your own chat before enabling notifications.');
}
main().catch(()=>{console.error('Cannot retrieve the chat ID. Check the private token, your connection, and send /start garbalia to the bot.');process.exitCode=1;});
