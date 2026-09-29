export async function register(){
  if(process.env.NEXT_RUNTIME!=='nodejs'||process.env.NEXT_PHASE==='phase-production-build')return;
  const state=globalThis as typeof globalThis & {garbaliaExpiryTimer?:ReturnType<typeof setInterval>};
  if(state.garbaliaExpiryTimer)return;
  const {expirePendingOrders}=await import('./lib/server/store');
  const {processOrderNotifications}=await import('./lib/server/notifications');
  let running=false;
  const sweep=async()=>{if(running)return;running=true;try{await expirePendingOrders();}catch{console.error('Pending-order expiry failed; it will retry.');}try{await processOrderNotifications();}catch{console.error('Order notification processing failed; it will retry.');}finally{running=false;}};
  state.garbaliaExpiryTimer=setInterval(sweep,60000);
  state.garbaliaExpiryTimer.unref();
  void sweep();
}
