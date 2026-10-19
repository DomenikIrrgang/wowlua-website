"use client";

import { useEffect, useState } from "react";

export type Choice = "system" | "dark" | "light";
export const CHOICES: Choice[] = ["system", "dark", "light"];

/** Runs before paint (in <head>) so a stored choice never flashes. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("wl-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

function stored(): Choice {
  try {
    const t = localStorage.getItem("wl-theme");
    return t === "dark" || t === "light" ? t : "system";
  } catch {
    return "system";
  }
}

function apply(choice: Choice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  try {
    if (choice === "system") localStorage.removeItem("wl-theme");
    else localStorage.setItem("wl-theme", choice);
  } catch {}
}

const OPTIONS: { choice: Choice; icon: React.ReactNode }[] = [
  {
    choice: "system",
    icon: (
      <>
        <rect x="1.75" y="2.75" width="12.5" height="8.5" />
        <path d="M5 14h6" />
      </>
    ),
  },
  { choice: "dark", icon: <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z" /> },
  {
    choice: "light",
    icon: (
      <>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" />
      </>
    ),
  },
];

/** The stored choice (null until mounted) and a setter that applies and stores it. */
export function useTheme(): [Choice | null, (c: Choice) => void] {
  const [choice, setChoice] = useState<Choice | null>(null);
  useEffect(() => setChoice(stored()), []);
  return [
    choice,
    (c) => {
      apply(c);
      setChoice(c);
    },
  ];
}

export function ThemeToggle() {
  const [choice, setChoice] = useTheme();

  return (
    <div className="wl-theme-toggle wl-theme-toggle--icons" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.choice}
          className="wl-theme-toggle__opt"
          aria-label={`${o.choice} theme`}
          title={o.choice}
          role="radio"
          aria-checked={choice === o.choice}
          type="button"
          onClick={() => setChoice(o.choice)}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            {o.icon}
          </svg>
          <span className="wl-theme-toggle__label">{o.choice}</span>
        </button>
      ))}
    </div>
  );
}
