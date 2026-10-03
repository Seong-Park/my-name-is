import { Pool } from 'pg';
import { fileURLToPath } from 'node:url';
import { HttpError } from './http';

export function databasePool():Pool {
  try {
    const url=new URL(process.env.DATABASE_URL??'');
    if(!['postgres:','postgresql:'].includes(url.protocol)||!url.username||!url.password) throw new Error('Invalid connection configuration');
    // Verify the remote certificate; never work around TLS errors by disabling verification.
    if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) url.searchParams.set('sslmode','verify-full');
    if(url.hostname.endsWith('.supabase.com') || url.hostname.endsWith('.supabase.co')) url.searchParams.set('sslrootcert',fileURLToPath(new URL('../../db/supabase-ca.crt',import.meta.url)));
    const pool=new Pool({connectionString:url.toString(),max:2,connectionTimeoutMillis:15000,idleTimeoutMillis:10000,application_name:'name-web'});
    // Active clients can emit an error between queries; query failures still reject normally.
    pool.on('connect',client=>client.on('error',()=>{}));
    pool.on('error',()=>{ /* Checked operations fail closed; never log a driver error containing connection data. */ });
    return pool;
  } catch { throw new HttpError(503,'BUDGET_STORE_UNAVAILABLE','DB 연결 설정을 확인해 주세요.',true); }
}
