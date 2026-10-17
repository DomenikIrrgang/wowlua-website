"use client";

import { useEffect } from "react";

/** Page-wide behaviour for server-rendered markup: copy buttons in code and terminal bars. */
export function Enhance() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-copy]");
      if (!btn) return;
      const box = btn.closest(".wl-code, .wl-term, .wl-copy-cmd, .wl-install");
      const node = box?.querySelector(".wl-copy-cmd__text, pre");
      const text = btn.dataset.copy || node?.textContent || "";
      const idle = btn.textContent;
      navigator.clipboard?.writeText(text.replace(/^\$ /gm, "")).then(
        () => {
          btn.dataset.state = "copied";
          btn.textContent = "copied";
          setTimeout(() => {
            delete btn.dataset.state;
            btn.textContent = idle;
          }, 1600);
        },
        () => {},
      );
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
