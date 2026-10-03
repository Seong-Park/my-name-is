// Uses session-local temporary copies only; never deletes live ledger rows.
import { loadEnvFile } from 'node:process';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { databasePool } from '../lib/server/database.ts';

try { loadEnvFile('.env.local'); } catch { /* CI environment. */ }
const pool=databasePool();
const client=await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL statement_timeout='5s'");
  await client.query('CREATE TEMP TABLE name_ai_days (LIKE name_private.name_ai_days INCLUDING ALL) ON COMMIT DROP');
  await client.query('CREATE TEMP TABLE name_ai_attempts (LIKE name_private.name_ai_attempts INCLUDING ALL) ON COMMIT DROP');
  await client.query('ALTER TABLE pg_temp.name_ai_attempts ADD FOREIGN KEY(day) REFERENCES pg_temp.name_ai_days(day)');
  await client.query("INSERT INTO pg_temp.name_ai_days(day) SELECT make_date(2026,n,1) FROM generate_series(1,6) n");
  const now=new Date('2026-09-28T15:00:00Z'); // Sep 29, 00:00 Korea; June month end + 90 days.
  const boundary=new Date(now.getTime()-7*86400000);
  const fixtures=[
    {month:1,state:'failed',settled:new Date(boundary.getTime()-1),finished:true},
    {month:2,state:'uncertain',settled:new Date('2026-02-02'),finished:true},
    {month:2,state:'uncertain',settled:new Date('2026-02-02'),finished:false},
    {month:3,state:'reserved',settled:null,finished:false},
    {month:4,state:'succeeded',settled:now,finished:true},
    {month:5,state:'failed',settled:boundary,finished:true},
    {month:5,state:'failed',settled:new Date(boundary.getTime()-1),finished:true},
  ];
  for(const row of fixtures) await client.query(`INSERT INTO pg_temp.name_ai_attempts
    (operation_id,analysis_id,candidate_id,attempt,idempotency_key,browser_mac,model,pricing_version,prompt_version,day,reserved_nano,cost_nano,state,settled_at,provider_finished_at)
    VALUES($1,$2,$3,0,$4,$3,'test','test','test',make_date(2026,$5,1),100,$6,$7,$8,$9)`,
    [randomUUID(),randomUUID(),'x'.repeat(43),randomUUID(),row.month,row.settled?100:null,row.state,row.settled,row.finished?row.settled:null]);
  for(const pass of [0,1]) {
    for(const [file,expected] of [['cleanup-ledger.sql',pass===0?2:0],['cleanup-days.sql',pass===0?2:0]] as const) {
      const sql=(await readFile(new URL(`../db/${file}`,import.meta.url),'utf8')).replaceAll('name_private.','pg_temp.');
      const {rows:[counts]}=await client.query(sql,[now]);
      assert.equal(Object.values(counts)[0],expected,file);
    }
  }
  const {rows:[retained]}=await client.query("SELECT count(*)::int count FROM pg_temp.name_ai_attempts WHERE state='uncertain'");
  assert.equal(retained.count,2,'Both unfinished and execution-finished uncertain charges are retained');
  console.log('RETENTION_TEMP_TABLE_TEST_PASSED: boundaries, uncertain, references, repeat run');
} catch {
  console.error('RETENTION_TEMP_TABLE_TEST_FAILED');
  process.exitCode=1;
} finally {
  await client.query('ROLLBACK');
  client.release();
  await pool.end();
}
