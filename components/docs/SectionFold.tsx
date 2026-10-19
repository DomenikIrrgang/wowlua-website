"use client";

import { useEffect } from "react";

const PHONE = "(max-width: 760px)";

/**
 * On phones, folds each section of a long reference page (`article.md[data-fold]`) behind its h2: the heading's text
 * becomes a button that opens and closes the section. A link to an anchor inside a folded section opens it.
 * Wider screens get the article untouched.
 */
export function SectionFold() {
  useEffect(() => {
    const article = document.querySelector<HTMLElement>("article.md[data-fold]");
    if (!article) return;
    const mq = window.matchMedia(PHONE);
    let undo: (() => void) | null = null;

    const fold = () => {
      const sections: { h2: HTMLElement; button: HTMLButtonElement; body: HTMLElement[] }[] = [];
      for (const child of Array.from(article.children) as HTMLElement[]) {
        if (child.tagName === "H2") {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "md-fold__toggle";
          const text = document.createElement("span");
          text.append(...Array.from(child.childNodes));
          button.append(text);
          child.append(button);
          sections.push({ h2: child, button, body: [] });
        } else sections.at(-1)?.body.push(child);
      }
      const set = (s: (typeof sections)[number], open: boolean) => {
        s.button.setAttribute("aria-expanded", String(open));
        s.h2.toggleAttribute("data-fold-open", open);
        for (const el of s.body) el.toggleAttribute("data-folded", !open);
      };
      const clicks = sections.map((s) => {
        const onClick = () => set(s, s.button.getAttribute("aria-expanded") !== "true");
        s.button.addEventListener("click", onClick);
        set(s, false);
        return onClick;
      });
      // Open the section a link points into, then bring the target into view.
      const reveal = () => {
        const id = decodeURIComponent(location.hash.slice(1));
        const target = id && document.getElementById(id);
        if (!target || !article.contains(target)) return;
        const s = sections.find((x) => x.h2 === target || x.body.some((el) => el.contains(target)));
        if (!s) return;
        set(s, true);
        if (target !== s.h2) requestAnimationFrame(() => target.scrollIntoView());
      };
      reveal();
      window.addEventListener("hashchange", reveal);
      return () => {
        window.removeEventListener("hashchange", reveal);
        sections.forEach((s, i) => {
          s.button.removeEventListener("click", clicks[i]);
          s.h2.append(...Array.from(s.button.firstChild!.childNodes));
          s.button.remove();
          s.h2.removeAttribute("data-fold-open");
          for (const el of s.body) el.removeAttribute("data-folded");
        });
      };
    };

    const apply = () => {
      if (mq.matches && !undo) undo = fold();
      else if (!mq.matches && undo) {
        undo();
        undo = null;
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      undo?.();
    };
  }, []);
  return null;
}
