"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page-transition.module.css";

type PageTransitionProps = {
  children: React.ReactNode;
};

const FADE_DURATION_MS = 320;
const NAVIGATION_DELAY_MS = 210;
const TRANSITION_FLAG = "dim-page-transition";

export function PageTransition({ children }: PageTransitionProps) {
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef<number | null>(null);
  const isFadingRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.remove("page-leaving");

    let enterFrame: number | null = null;
    let cleanupTimer: number | null = null;

    try {
      if (window.sessionStorage.getItem(TRANSITION_FLAG) === "1") {
        window.sessionStorage.removeItem(TRANSITION_FLAG);

        enterFrame = window.requestAnimationFrame(() => {
          document.documentElement.classList.add("page-enter-active");
          document.documentElement.classList.remove("page-entering");

          cleanupTimer = window.setTimeout(() => {
            document.documentElement.classList.remove("page-enter-active");
          }, FADE_DURATION_MS);
        });
      }
    } catch {}

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a");
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      if (
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.getAttribute("rel") === "external"
      ) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);

      if (destination.origin !== current.origin) {
        return;
      }

      if (
        destination.pathname === current.pathname &&
        destination.search === current.search
      ) {
        return;
      }

      if (isFadingRef.current) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      isFadingRef.current = true;
      setIsFading(true);
      document.documentElement.classList.remove(
        "page-entering",
        "page-enter-active",
      );
      document.documentElement.classList.add("page-leaving");

      try {
        window.sessionStorage.setItem(TRANSITION_FLAG, "1");
      } catch {}

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        window.location.assign(destination.href);
      }, NAVIGATION_DELAY_MS);
    };

    const handlePageShow = () => {
      document.documentElement.classList.remove("page-leaving");
      isFadingRef.current = false;
      setIsFading(false);
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("pageshow", handlePageShow);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      if (enterFrame !== null) {
        window.cancelAnimationFrame(enterFrame);
      }

      if (cleanupTimer !== null) {
        window.clearTimeout(cleanupTimer);
      }
    };
  }, []);

  return (
    <div className={`${styles.shell} ${isFading ? styles.fading : ""}`.trim()}>
      {children}
    </div>
  );
}
