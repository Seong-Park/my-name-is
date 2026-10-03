export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public retryable = false, public retryAfterSeconds?: number) { super(message); }
}
export const privateHeaders = {'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
export const invalidInput = () => new HttpError(400, 'INVALID_INPUT', '요청 형식을 확인해 주세요.');
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw invalidInput();
  const tooLarge = () => new HttpError(413, 'BODY_TOO_LARGE', '요청 크기가 허용 범위를 넘었어요.');
  const length = request.headers.get('content-length');
  if (length !== null && !/^\d+$/.test(length)) throw invalidInput();
  if (length !== null && Number(length) > 16384) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw invalidInput();
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16384) { await reader.cancel(); throw tooLarge(); }
      chunks.push(value);
    }
    const value: unknown = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(Buffer.concat(chunks)));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidInput();
    return value as Record<string, unknown>;
  } catch (error) { if (error instanceof HttpError) throw error; throw invalidInput(); }
  finally { reader.releaseLock(); }
}
export function errorResponse(error: HttpError) {
  return Response.json({error:{code:error.code,message:error.message,retryable:error.retryable,...(error.retryAfterSeconds===undefined?{}:{retryAfterSeconds:error.retryAfterSeconds})},requestId:crypto.randomUUID()},{status:error.status,headers:{...privateHeaders,...(error.retryAfterSeconds===undefined?{}:{'Retry-After':String(error.retryAfterSeconds)})}});
}
