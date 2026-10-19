"use client";

import { useId, useState } from "react";

export type FeatureItem = { tag: string; title?: string; body: string; code?: React.ReactNode };

/** The feature grid on a phone: numbered rows, one open at a time, the first open to begin with. */
export function FeatureAccordion({ items }: { items: FeatureItem[] }) {
  const [open, setOpen] = useState(0);
  const id = useId();

  return (
    <ol className="landing-acc" aria-label="Features">
      {items.map((f, i) => {
        const expanded = open === i;
        const panel = `${id}-panel-${i}`;
        return (
          <li className="landing-acc__item" key={f.tag}>
            <h3 className="landing-acc__head">
              <button className="landing-acc__btn" type="button" aria-expanded={expanded} aria-controls={panel} onClick={() => setOpen(expanded ? -1 : i)}>
                <span className="label landing-acc__num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="landing-acc__titles">
                  <span className="label landing-acc__tag">{f.tag}</span>
                  {f.title && <span className="heading-3">{f.title}</span>}
                </span>
                <span className="landing-acc__sign" aria-hidden="true">
                  {expanded ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div className="landing-acc__panel" id={panel} hidden={!expanded}>
              <p className="body-s" dangerouslySetInnerHTML={{ __html: f.body }} />
              {f.code && <pre className="landing-acc__code">{f.code}</pre>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
