// Operator-only. No provider calls. Read docs/operations/name-ai-ledger.md first.
import { loadEnvFile } from 'node:process';
import { readFile } from 'node:fs/promises';
import { databasePool } from '../lib/server/database.ts';
import { settleStory } from '../lib/server/ledger.ts';
import { uuidPattern } from '../lib/server/http.ts';

try { loadEnvFile('.env.local'); } catch { /* Explicit environment is supported. */ }
const [action,id,cost,input,output,...extra]=process.argv.slice(2);
const integer=(s:string|undefined)=>typeof s==='string'&&/^\d+$/.test(s)&&Number.isSafeInteger(Number(s));
if(extra.length||!(action==='cleanup'&&id==='--apply'&&cost===undefined
  ||action==='finished'&&uuidPattern.test(id??'')&&cost===undefined
  ||action==='failed'&&uuidPattern.test(id??'')&&integer(cost)&&integer(input)&&integer(output))) {
  throw new Error('Use cleanup --apply, finished OPERATION_UUID, or failed OPERATION_UUID COST_NANO INPUT_TOKENS OUTPUT_TOKENS');
}
const pool=databasePool();
try {
  if(action==='cleanup') {
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout='5s'");
      await client.query('SELECT pg_advisory_xact_lock(716240101)');
      const {rows:[clock]}=await client.query('SELECT statement_timestamp() AS now');
      const result:Record<string,number>={};
      for(const file of ['cleanup-ledger.sql','cleanup-days.sql']) {
        const {rows:[counts]}=await client.query(await readFile(new URL(`../db/${file}`,import.meta.url),'utf8'),[clock.now]);
        Object.assign(result,counts);
      }
      await client.query('COMMIT');
      console.log(JSON.stringify(result));
    } catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  } else {
    // Unknown output cannot become a displayed success. Confirmed charges settle as failure.
    const {rows:[row]}=await pool.query('SELECT state FROM name_private.name_ai_attempts WHERE operation_id=$1',[id]);
    if(row?.state!=='uncertain') throw new Error('UNCERTAIN_ATTEMPT_REQUIRED');
    const changed=await settleStory(pool,id,action==='finished'
      ?{state:'uncertain',providerFinished:true}
      :{state:'failed',costNano:BigInt(cost),inputTokens:Number(input),outputTokens:Number(output),errorCode:'PROVIDER_FAILED'});
    console.log(JSON.stringify({changed}));
  }
} catch {
  console.error('LEDGER_MAINTENANCE_FAILED_CHECK_STATE');
  process.exitCode=1;
} finally { await pool.end(); }
