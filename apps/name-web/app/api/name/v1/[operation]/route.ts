import { searchHanja } from '../../../../../lib/server/hanja';
import { parseAnalysisInput } from '../../../../../lib/server/input';
import { analyze,analysisContent,analysisVersions,VISIBLE_COUNT } from '../../../../../lib/server/analysis';
import { browserIdentity,verifyReceipt } from '../../../../../lib/server/receipt';
import { readJson, errorResponse, HttpError,invalidInput,uuidPattern } from '../../../../../lib/server/http';
import { generateStory } from '../../../../../lib/server/story';
import { createHash } from 'node:crypto';
import { checkRateLimit } from '../../../../../lib/server/rate-limit';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  };
  const { operation } = await context.params;
  const error = (status: number, code: string, message: string) =>
    Response.json(
      {
        error: { code, message, retryable: false },
        requestId: crypto.randomUUID(),
      },
      { status, headers },
    );
  const serviceOrigin = process.env.NAME_WEB_ORIGIN ?? "http://127.0.0.1:3100";
  if (request.headers.get("origin") !== serviceOrigin)
    return error(
      403,
      "ORIGIN_REJECTED",
      "같은 서비스 화면에서 다시 요청해 주세요.",
    );
  if (!["hanja-search", "analyses", "stories"].includes(operation))
    return error(404, "NOT_FOUND", "지원하지 않는 요청이에요.");
  try {
    const body = await readJson(request);
    if (operation === 'stories' && !uuidPattern.test(request.headers.get('Idempotency-Key') ?? '')) throw invalidInput();
    const identity=operation==='hanja-search'&&!process.env.NAME_RECEIPT_SECRET?undefined:browserIdentity(request.headers.get('cookie'),process.env.NODE_ENV==='production'||serviceOrigin.startsWith('https:'));
    const rateKey=identity?createHash('sha256').update(identity.token).digest('base64url'):'anonymous';
    if (operation === 'hanja-search') {
      checkRateLimit('hanja-search',rateKey);
      return Response.json(searchHanja(body), {headers:{...headers,...(identity?.setCookie?{'Set-Cookie':identity.setCookie}:{})}});
    }
    if (operation === 'analyses') {
      checkRateLimit('analyses',rateKey);
      const input=parseAnalysisInput(body);
      const result=analyze(input,identity!.token);
      return Response.json(result,{headers:{...headers,...(identity!.setCookie?{'Set-Cookie':identity!.setCookie}:{})}});
    }
    if(Object.keys(body).sort().join(',')!=='attempt,candidateId,input,receipt'||![0,1].includes(body.attempt as number)||typeof body.candidateId!=='string'||typeof body.receipt!=='string'||!body.input||typeof body.input!=='object'||Array.isArray(body.input)) throw invalidInput();
    const input=parseAnalysisInput(body.input as Record<string,unknown>);
    const receipt=verifyReceipt(body.receipt,input,analysisVersions(input),identity!.token,VISIBLE_COUNT);
    const {recommendations}=analysisContent(input,receipt.analysisId);
    const candidate=[...recommendations.balance.candidates,...recommendations.amplify.candidates].find(c=>c.candidateId===body.candidateId);
    if(!candidate) throw new HttpError(403,'RECEIPT_INVALID','이 분석에서 공개된 추천 이름만 사용할 수 있어요.');
    checkRateLimit('stories',receipt.browserMac,JSON.stringify([receipt.analysisId,candidate.candidateId,body.attempt]));
    return Response.json(await generateStory(receipt,candidate,body.attempt as 0|1,request.headers.get('Idempotency-Key')!),{headers});
  } catch (e) {
    return errorResponse(e instanceof HttpError ? e : new HttpError(500, 'REQUEST_FAILED', '요청을 처리하지 못했어요.'));
  }
}
