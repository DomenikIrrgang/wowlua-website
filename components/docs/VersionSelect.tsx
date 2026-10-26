"use client";

import { usePathname, useRouter } from "next/navigation";

export type VersionOption = { id: string; label: string; caption: string };

/** Switches docs version, keeping the page when the other version has it (the server 404s otherwise). */
export function VersionSelect({ id, value, options }: { id: string; value: string; options: VersionOption[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/docs";

  return (
    <div className="wl-select wl-select--small">
      <select
        className="wl-select__control"
        id={id}
        value={value}
        onChange={async (e) => {
          const next = e.target.value;
          const rest = pathname.replace(/^\/docs(\/\d+\.\d+)?/, "");
          const base = next === "main" ? "/docs" : `/docs/${next}`;
          const target = `${base}${rest.startsWith("/reference/diagnostics/") ? "/reference/diagnostics" : rest}`;
          // Fall back to that version's start page when this page did not exist yet.
          const ok = await fetch(target, { method: "HEAD" }).then((r) => r.ok, () => false);
          router.push(ok ? target : base);
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
