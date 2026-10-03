import { loadEnvFile } from 'node:process';
import { readFile } from 'node:fs/promises';
import { databasePool } from '../lib/server/database.ts';

try { loadEnvFile('.env.local'); } catch { /* Allow explicit process environment in CI. */ }
const action=process.argv[2];
if(action!=='check'&&action!=='migrate') throw new Error('Use check or migrate');
const pool=databasePool();
try {
  const {rows:[state]}=await pool.query(`SELECT current_setting('server_version_num') version,
    to_regnamespace('name_private') IS NOT NULL AS schema_exists,
    (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls`);
  console.log(JSON.stringify({connected:true,postgresVersion:state.version,clientTlsMode:'verify-full for remote hosts',poolerBackendTls:state.tls,ledgerSchemaExists:state.schema_exists}));
  if(action==='check'&&state.schema_exists) {
    const {rows:[totals]}=await pool.query(`SELECT coalesce(sum(call_count),0)::text calls,
      coalesce(sum(success_count),0)::text succeeded,coalesce(sum(failure_count),0)::text failed,
      coalesce(sum(cost_nano),0)::text cost_nano,coalesce(sum(reserved_nano),0)::text reserved_nano,
      coalesce(bool_or(ai_halted),false) ai_halted FROM name_private.name_ai_days`);
    console.log(JSON.stringify({ledgerTotals:totals}));
    const {rows:errors}=await pool.query(`SELECT error_code,count(*)::text count FROM name_private.name_ai_attempts WHERE error_code IS NOT NULL GROUP BY error_code ORDER BY error_code`);
    console.log(JSON.stringify({ledgerErrors:errors}));
  }
  if(action==='migrate') {
    if(state.schema_exists) throw new Error('LEDGER_SCHEMA_ALREADY_EXISTS');
    await pool.query(await readFile(new URL('../db/001-cost-ledger.sql',import.meta.url),'utf8'));
    console.log('COST_LEDGER_MIGRATION_APPLIED');
  }
} catch(error) {
  const code=error && typeof error==='object' && 'code' in error ? String(error.code) : 'CONFIG_OR_MIGRATION_ERROR';
  console.error(/^[A-Z0-9_]+$/.test(code)?code:'DATABASE_ERROR');
  process.exitCode=1;
} finally { await pool.end(); }
