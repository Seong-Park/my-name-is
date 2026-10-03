import { test } from "node:test";
import assert from "node:assert/strict";
import { readRecord, writeRecord } from "../lib/client/record.ts";
test("손상 기록을 보존하고 다른 탭 변경과 저장 실패를 덮어쓰지 않는다", async () => {
  let raw: string | null = "{broken";
  const storage = {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      raw = value;
    },
    removeItem: () => {
      raw = null;
    },
  };
  const lock = { request: async (_key: string, fn: () => unknown) => fn() };
  assert.equal(readRecord(storage, "record").status, "corrupt");
  assert.equal(raw, "{broken");
  assert.equal(
    await writeRecord(storage, lock, "record", null, null),
    "changed",
  );
  assert.equal(raw, "{broken");
  assert.equal(
    await writeRecord(storage, undefined, "record", raw, null),
    "unavailable",
  );
  assert.equal(typeof await writeRecord(storage, lock, "record", raw, null), "object");
  assert.equal(readRecord(storage, "record").status, "empty");
  const blocked = {
    ...storage,
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(
    await writeRecord(blocked, lock, "record", raw, null),
    "failed",
  );
});

test('삭제 revision은 빈 저장소에서도 늦은 다른 탭 저장을 거절한다', async () => {
  let raw: string | null = null;
  const storage = {getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;},removeItem:()=>{raw=null;}};
  const locks = {request:async (_key:string,fn:()=>unknown)=>fn()};
  await writeRecord(storage,locks,'record',null,null);
  assert.notEqual(raw,null);
  assert.equal(readRecord(storage,'record').status,'empty');
  assert.equal(await writeRecord(storage,locks,'record',null,null),'changed');
  const first=raw;
  await writeRecord(storage,locks,'record',first,null);
  assert.notEqual(raw,first);
});
