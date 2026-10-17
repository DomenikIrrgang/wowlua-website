"use client";

import { useRef, useState } from "react";
import type { InstallCommand } from "@/lib/readme";

/** The install box: one tab per platform, commands from the README. */
export function InstallTabs({ commands, after }: { commands: InstallCommand[]; after: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (i: number) => {
    setActive(i);
    tabs.current[i]?.focus();
  };

  return (
    <div className="wl-tabs">
      <div className="wl-tabs__list" role="tablist" aria-label="Platform">
        {commands.map((c, i) => (
          <button
            key={c.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            className="wl-tabs__tab"
            role="tab"
            aria-selected={i === active}
            id={`install-tab-${c.id}`}
            aria-controls={`install-panel-${c.id}`}
            tabIndex={i === active ? 0 : -1}
            type="button"
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") select((i + 1) % commands.length);
              else if (e.key === "ArrowLeft") select((i - 1 + commands.length) % commands.length);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {commands.map((c, i) => (
        <div key={c.id} className="wl-install__body" role="tabpanel" id={`install-panel-${c.id}`} aria-labelledby={`install-tab-${c.id}`} hidden={i !== active}>
          <div className="wl-copy-cmd">
            <span className="wl-copy-cmd__prompt" aria-hidden="true">
              {c.prompt}
            </span>
            <code className="wl-copy-cmd__text">{c.command}</code>
            <button className="wl-copy-cmd__btn" type="button" aria-label="copy install command" data-copy={c.command}>
              copy
            </button>
          </div>
          <p className="wl-install__note">
            {c.note} {c.id !== "source" && after}
          </p>
        </div>
      ))}
    </div>
  );
}
