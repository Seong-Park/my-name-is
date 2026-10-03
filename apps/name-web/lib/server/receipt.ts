import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { emptyInput, type Input } from '../contracts';
import { HttpError } from './http';

const DAY = 86400000;
export type AgeBand = '0–5' | '6–12' | '13–18' | '19+';
type Receipt = {
  v: 1; keyId: 'v1'; analysisId: string; inputMac: string; browserMac: string;
  versions: Record<string,string>; visibleCount: number; ageBand: AgeBand;
  issuedAt: number; expiresAt: number;
};
const invalid = () => new HttpError(403,'RECEIPT_INVALID','분석 정보를 확인할 수 없어요. 새로 분석해 주세요.');
function mac(purpose: string, value: string): string {
  const key = process.env.NAME_RECEIPT_SECRET;
  if (!key || !/^[0-9a-f]{64}$/i.test(key)) throw new HttpError(503,'CALCULATION_UNAVAILABLE','분석 서명 설정을 준비하고 있어요.');
  const derived = createHmac('sha256',Buffer.from(key,'hex')).update(`name-v1:${purpose}`).digest();
  return createHmac('sha256',derived).update(value).digest('base64url');
}
function equal(a: unknown, b: string): boolean {
  return typeof a==='string' && Buffer.byteLength(a)===Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
}
const inputMac = (input: Input) => mac('input',JSON.stringify(Object.keys(emptyInput).map(key=>input[key as keyof Input])));
const canonicalVersions = (versions: Record<string,string>) => JSON.stringify(Object.entries(versions).sort(([a],[b])=>a<b?-1:a>b?1:0));

// Signed creation time enforces absolute expiry even if a client retains an expired cookie.
export function browserIdentity(cookieHeader: string | null, secure: boolean, now = Date.now()) {
  const name = secure ? '__Host-name-browser' : 'name-browser-dev';
  const cookies = (cookieHeader ?? '').split(';').map(x=>x.trim()).filter(x=>x.startsWith(`${name}=`));
  if (cookies.length===1) {
    const token = cookies[0].slice(name.length+1);
    const parts = token.split('.');
    const issued = Number(parts[1]);
    if (parts.length===3 && /^[A-Za-z0-9_-]{43}$/.test(parts[0]) && /^\d{13}$/.test(parts[1]) && issued<=now && now-issued<30*DAY && equal(parts[2],mac('cookie',`${parts[0]}.${parts[1]}`))) return {token};
  }
  const value = `${randomBytes(32).toString('base64url')}.${now}`;
  const token = `${value}.${mac('cookie',value)}`;
  return {token,setCookie:`${name}=${token}; Max-Age=2592000; HttpOnly; SameSite=Strict; Path=/${secure?'; Secure':''}`};
}

export function issueReceipt(input: Input, versions: Record<string,string>, browser: string, ageBand: AgeBand, visibleCount: number, now = Date.now()) {
  if (![1,2,3].includes(visibleCount)) throw new Error('Invalid public candidate count');
  const payload: Receipt = {v:1,keyId:'v1',analysisId:randomUUID(),inputMac:inputMac(input),browserMac:mac('browser',browser),versions,visibleCount,ageBand,issuedAt:now,expiresAt:now+DAY};
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const receipt = `${encoded}.${mac('receipt',encoded)}`;
  if (Buffer.byteLength(receipt)>2048) throw new HttpError(503,'CALCULATION_UNAVAILABLE','분석 서명 설정을 확인하고 있어요.');
  return {analysisId:payload.analysisId,receipt};
}

export function verifyReceipt(receipt: string, input: Input, versions: Record<string,string>, browser: string, visibleCount: number, now = Date.now()): Receipt {
  if (typeof receipt!=='string' || Buffer.byteLength(receipt)>2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(receipt)) throw invalid();
  const [encoded,signature] = receipt.split('.');
  if (!equal(signature,mac('receipt',encoded))) throw invalid();
  let value: unknown;
  try { value=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8')); } catch { throw invalid(); }
  if (!value || typeof value!=='object' || Array.isArray(value)) throw invalid();
  const p = value as Receipt;
  if (p.v!==1 || p.keyId!=='v1' || typeof p.analysisId!=='string' || !/^[0-9a-f-]{36}$/.test(p.analysisId) || !Number.isSafeInteger(p.issuedAt) || p.issuedAt>now || p.expiresAt!==p.issuedAt+DAY || !['0–5','6–12','13–18','19+'].includes(p.ageBand) || !p.versions || typeof p.versions!=='object' || Array.isArray(p.versions)) throw invalid();
  if (!equal(p.inputMac,inputMac(input)) || !equal(p.browserMac,mac('browser',browser))) throw invalid();
  if (now>=p.expiresAt) throw new HttpError(410,'RECEIPT_EXPIRED','회상문 생성 기간이 지났어요. 새로 분석해 주세요.');
  if (p.visibleCount!==visibleCount || canonicalVersions(p.versions)!==canonicalVersions(versions)) throw new HttpError(409,'ANALYSIS_STALE','분석 기준이 바뀌었어요. 새로 분석해 주세요.');
  return p;
}

export const candidateId = (analysisId: string, type: 'balance'|'amplify', internalKey: string) => mac('candidate',JSON.stringify([analysisId,type,internalKey]));
