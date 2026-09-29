import {loadEnvConfig} from '@next/env';
import {expirePendingOrders} from '../src/lib/server/store';
import {getDatabase} from '../src/lib/server/database';
async function main(){loadEnvConfig(process.cwd());console.log(`Expired orders: ${await expirePendingOrders()}`);await(await getDatabase()).close();}
main().catch(()=>{console.error('Order expiry failed. Check database configuration.');process.exitCode=1;});
