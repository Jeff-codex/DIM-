"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import styles from "./submit-security-gate.module.css";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
    };
  }
}

type SubmitSecurityConfig = {
  turnstileSiteKey: string | null;
  workflowEnv: string;
};

export function SubmitSecurityGate() {
  const [config, setConfig] = useState<SubmitSecurityConfig | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        const response = await fetch("/api/public-config/submit", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("public-submit-config-failed");
        }

        const data = (await response.json()) as SubmitSecurityConfig & { ok?: boolean };

        if (active) {
          setConfig({
            turnstileSiteKey: data.turnstileSiteKey,
            workflowEnv: data.workflowEnv,
          });
        }
      } catch {
        if (active) {
          setLoadFailed(true);
        }
      }
    }

    void loadConfig();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!config?.turnstileSiteKey || !scriptReady || !widgetRef.current || widgetIdRef.current) {
      return;
    }

    if (!window.turnstile) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(widgetRef.current, {
      sitekey: config.turnstileSiteKey,
      theme: "light",
    });
  }, [config, scriptReady]);

  const showWidget = Boolean(config?.turnstileSiteKey);
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.label}>제출 전 확인</p>
        <p className={styles.copy}>
          사람이 보낸 제안인지 한 번 더 확인합니다
        </p>
      </div>
      {showWidget ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onLoad={() => setScriptReady(true)}
          />
          <div ref={widgetRef} className={styles.widget} />
        </>
      ) : (
        <p className={styles.note}>
          {loadFailed
            ? "확인 단계가 열리지 않으면 잠시 후 다시 시도해 주세요"
            : "제출 전에 필요한 확인 절차가 함께 적용됩니다"}
        </p>
      )}
      {showWidget ? (
        <p className={styles.subtle}>
          확인을 마치면 바로 제안을 보낼 수 있습니다
        </p>
      ) : null}
    </div>
  );
}
