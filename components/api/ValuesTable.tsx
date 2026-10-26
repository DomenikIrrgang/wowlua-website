import type { Value } from "@/lib/api";
import { inlineMd } from "@/lib/inline";
import { wowType } from "./shared";

/** Arguments, results, payload values or a structure's fields: name, wowlua type, description (when any has one). */
export function ValuesTable({
  values,
  label,
  caption,
  first = "name",
  numbered,
}: {
  values: Value[];
  label: string;
  caption?: string;
  first?: string;
  numbered?: boolean;
}) {
  const described = values.some((v) => v.doc || v.default !== undefined);
  return (
    <div className="wl-table" role="region" aria-label={label} tabIndex={0}>
      <table>
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {numbered && <th scope="col">#</th>}
            <th scope="col">{first}</th>
            <th scope="col">type</th>
            {described && <th scope="col">description</th>}
          </tr>
        </thead>
        <tbody>
          {values.map((v, i) => (
            <tr key={v.name || i}>
              {numbered && <td>{i + 1}</td>}
              <td>
                <code className="wl-icode">{v.name}</code>
              </td>
              <td data-label="type">
                <span className="tok-t">{wowType(v.type)}</span>
              </td>
              {described && (
                <td data-label="description">
                  {v.doc && <span dangerouslySetInnerHTML={{ __html: inlineMd(v.doc) }} />}
                  {v.default !== undefined && <span className="wl-muted">{v.doc ? " " : ""}Default: {JSON.stringify(v.default)}.</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
