import type { Metadata } from "next";
import Link from "next/link";
import { ogMetadata } from "@/lib/og";
import { highlight } from "@/lib/highlight";

export const metadata: Metadata = {
  title: "Badge",
  description: "A “built with wowlua” badge for your addon's website, README, CurseForge or WoWInterface page.",
  ...ogMetadata("/badge", "Built with wowlua: the badge", "A badge for your addon's website, README, CurseForge or WoWInterface page."),
};

const SITE = process.env.SITE_URL ?? "https://wowlua.dev";

const VARIANTS = [
  { id: "dark", file: "built-with-wowlua-dark.svg", label: "dark", note: "for dark pages", height: 36, bg: "#14120e" },
  { id: "light", file: "built-with-wowlua-light.svg", label: "light", note: "for light pages", height: 36, bg: "#f7f6f2" },
  { id: "flat", file: "built-with-wowlua.svg", label: "flat", note: "for READMEs, next to other badges", height: 20, bg: "#f7f6f2" },
];

const snippets = (file: string, height: number) => {
  const img = `${SITE}/badge/${file}`;
  return [
    { lang: "html", label: "html", code: `<a href="${SITE}"><img src="${img}" alt="built with wowlua" height="${height}"></a>` },
    { lang: "text", label: "markdown (GitHub, CurseForge)", code: `[![built with wowlua](${img})](${SITE})` },
    { lang: "text", label: "bbcode (WoWInterface)", code: `[url=${SITE}][img]${img}[/img][/url]` },
  ];
};

export default function BadgePage() {
  return (
    <main className="page" id="main" style={{ maxWidth: 1008 }}>
      <div className="page__head">
        <span className="label" style={{ color: "var(--amber-ink)" }}>
          [ badge ]
        </span>
        <h1 className="display-l">Built with wowlua</h1>
        <p>
          Moved your addon to wowlua? Show it on your website, README or addon page. The badges are SVG, so they stay sharp at any size, and they link here. Then add your addon to
          the <Link href="/showcase">showcase</Link>.
        </p>
      </div>

      {VARIANTS.map((v) => (
        <section key={v.id} className="badge-variant" aria-labelledby={`badge-${v.id}`}>
          <div className="badge-variant__head">
            <h2 id={`badge-${v.id}`} className="heading-2" style={{ margin: 0 }}>
              {v.label}
            </h2>
            <span className="caption" style={{ color: "var(--ink-muted)" }}>
              {v.note}
            </span>
          </div>
          <div className="badge-variant__preview" style={{ background: v.bg }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/badge/${v.file}`} alt="built with wowlua" height={v.height} />
          </div>
          {snippets(v.file, v.height).map((s) => (
            <figure key={s.label} className="wl-code" style={{ margin: 0 }}>
              <div className="wl-code__bar">
                <span className="wl-code__file">{s.label}</span>
                <button className="wl-textbtn" type="button" data-copy={s.code}>
                  copy
                </button>
              </div>
              <pre className="wl-code__pre">
                <code dangerouslySetInnerHTML={{ __html: highlight(s.code, s.lang) }} />
              </pre>
            </figure>
          ))}
        </section>
      ))}
    </main>
  );
}
