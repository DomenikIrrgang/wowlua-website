import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiLayout, ApiMobileToc, tocOf } from "@/components/api/ApiLayout";
import { ApiSection, EntryHead, StatusMeter, countsText } from "@/components/api/parts";
import { fmt, widgetHref } from "@/components/api/shared";
import { type Widget, api, methodCounts, widgetsByKind } from "@/lib/api";
import { ogMetadata } from "@/lib/og";

const DESCRIPTION = "The widget types of the WoW API and the types they are built on: their methods, and how far wowlua's emulator implements them.";

export function generateMetadata(): Metadata {
  return { title: "Widgets · WoW API", description: DESCRIPTION, ...ogMetadata("/api/widgets", "Widgets · WoW API", DESCRIPTION) };
}

function WidgetTable({ widgets, label }: { widgets: Widget[]; label: string }) {
  return (
    <div className="wl-table" role="region" aria-label={label} tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col">type</th>
            <th scope="col">inherits from</th>
            <th scope="col">methods</th>
          </tr>
        </thead>
        <tbody>
          {widgets.map((w) => {
            const c = methodCounts(w.methods);
            return (
              <tr key={w.name}>
                <td className="api-name">
                  <Link href={widgetHref(w.name)}>
                    <code>{w.name}</code>
                  </Link>
                </td>
                <td data-label="inherits from">
                  <code className="caption">{w.bases.join(", ") || "—"}</code>
                </td>
                <td data-label="methods">
                  {c.total ? (
                    <span className="api-wcount">
                      <StatusMeter counts={c} height={6} />
                      <span className="caption wl-muted">
                        {fmt(c.total)}: {countsText(c)}
                      </span>
                    </span>
                  ) : (
                    <span className="caption wl-muted">none of its own</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function WidgetsPage() {
  const a = api();
  if (!a) notFound();
  const { types, bases } = widgetsByKind(a);
  const m = a.summary.methods;
  const toc = tocOf([
    ["types", `Widget types · ${types.length}`],
    ["bases", `Other types · ${bases.length}`],
  ]);
  return (
    <ApiLayout api={a} current="w:all" crumbs={[{ label: "widgets" }]} path="/api/widgets" toc={toc}>
      <EntryHead
        title="Widgets"
        badges={
          <>
            <span className="wl-badge">{fmt(m.total)} methods</span>
            <span className="wl-badge">available in: {a.flavor}</span>
          </>
        }
      />
      <div className="api-total">
        <StatusMeter counts={m} label={`${fmt(m.total)} widget methods: ${countsText(m, ", ")}`} />
        <span className="caption">
          {fmt(m.total)} widget methods: {countsText(m)}
        </span>
      </div>
      <ApiMobileToc toc={toc} path="/api/widgets" />
      <ApiSection id="types" title="Widget types">
        <p className="body-s api-muted">
          The types <code className="wl-icode">CreateFrame</code> makes.
        </p>
        <WidgetTable widgets={types} label="Widget types" />
      </ApiSection>
      <ApiSection id="bases" title="Other types">
        <p className="body-s api-muted">The types the widgets are built on, and the API&apos;s other objects with methods.</p>
        <WidgetTable widgets={bases} label="Other types" />
      </ApiSection>
    </ApiLayout>
  );
}
