"use client";
import { useState } from "react";
import { Button, Dialog } from "./ui";
type Kakao = {
  init(key: string): void;
  isInitialized(): boolean;
  Share: { sendDefault(template: unknown): void };
};
declare global {
  interface Window {
    Kakao?: Kakao;
  }
}
export function serviceUrl(origin: string) {
  return new URL("/", origin).href;
}
export function ShareDialog({
  close,
  failCopy = false,
}: {
  close: () => void;
  failCopy?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = serviceUrl(window.location.origin);
  async function copy(prefix = "") {
    try {
      if (failCopy) throw new Error("Development clipboard failure");
      await navigator.clipboard.writeText(url);
      setMessage(`${prefix}시작 링크를 복사했어요.`);
      setManual(false);
    } catch {
      setMessage(
        `${prefix}복사하지 못했어요. 아래 시작 URL을 직접 선택해 복사해 주세요.`,
      );
      setManual(true);
    }
  }
  async function kakao() {
    if (busy) return;
    setBusy(true);
    try {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) throw new Error("Kakao key not configured");
      if (!window.Kakao)
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";
          script.crossOrigin = "anonymous";
          script.onload = () => resolve();
          script.onerror = () => {
            script.remove();
            reject(new Error("SDK unavailable"));
          };
          document.head.appendChild(script);
        });
      if (!window.Kakao) throw new Error("SDK unavailable");
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      window.Kakao.Share.sendDefault({
        objectType: "text",
        text: "나의 이름은 — 내 이름에 담긴 뜻과 또 다른 이름의 이야기를 만나보세요.",
        link: { mobileWebUrl: url, webUrl: url },
        buttonTitle: "내 이름 살펴보기",
      });
      setMessage("카카오톡 공유 화면에서 직접 보낼 대상을 선택해 주세요.");
    } catch {
      await copy("카카오톡 공유를 열지 못했어요. ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="친구도 자신의 이름을 만나도록" onClose={close}>
      <p className="muted">
        서비스 시작 주소와 공통 소개만 보냅니다. 내 이름·출생정보·평가 결과는
        전달하지 않아요.
      </p>
      <Button busy={busy} onClick={kakao}>
        카카오톡으로 보내기
      </Button>
      <Button variant="secondary" onClick={() => copy()}>
        링크 복사
      </Button>
      {message && <p role="status">{message}</p>}
      {manual && (
        <>
          <label htmlFor="share-url">서비스 시작 URL</label>
          <input
            className="control"
            id="share-url"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
          />
        </>
      )}
      <Button variant="quiet" onClick={close}>
        닫기
      </Button>
    </Dialog>
  );
}
