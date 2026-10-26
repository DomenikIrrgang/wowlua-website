// A terminal transcript in the design's wl-term frame. Output lines are kept as
// the compiler printed them; their status word (PASS, Created, Built, …) gets
// the success colour, as in a real terminal.

export type TermLine = { cmd: string; comment?: string } | { out: string };

const STATUS = /^(\s*)(PASS|✓|Tested|Created|Built|Installed|Ready|Finished|Packaged)( .*)?$/;

function Out({ text }: { text: string }) {
  const m = STATUS.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}
      <span className="wl-term__ok">{m[2]}</span>
      {m[3]}
    </>
  );
}

/**
 * `lines` in order; comments line up one column after the longest command, or go on their own
 * line above it with `commentsAbove` (for narrow boxes). `caret` ends the transcript with a
 * blinking cursor.
 */
export function Terminal({
  title,
  lines,
  caret,
  small,
  commentsAbove,
  className,
  style,
}: {
  title: string;
  lines: TermLine[];
  caret?: boolean;
  small?: boolean;
  commentsAbove?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const width = Math.max(0, ...lines.map((l) => ("cmd" in l && l.comment ? l.cmd.length : 0)));
  return (
    <figure className={`wl-term${className ? ` ${className}` : ""}`} style={{ margin: 0, ...style }}>
      <div className="wl-term__bar">
        <span>{title}</span>
        <span>zsh</span>
      </div>
      <pre className="wl-term__body" style={small ? { fontSize: 12, lineHeight: "20px" } : undefined}>
        {lines.map((l, i) => {
          const end = i === lines.length - 1 ? caret && <span className="wl-caret" aria-hidden="true" /> : "\n";
          return "cmd" in l ? (
            <span key={i}>
              {commentsAbove && l.comment && <span className="wl-term__comment">{`# ${l.comment}\n`}</span>}
              <span className="wl-term__prompt">$</span> <span className="wl-term__cmd">{l.cmd}</span>
              {!commentsAbove && l.comment && (
                <>
                  {" ".repeat(width - l.cmd.length + 1)}
                  <span className="wl-term__comment"># {l.comment}</span>
                </>
              )}
              {end}
            </span>
          ) : (
            <span className="wl-term__out" key={i}>
              <Out text={l.out} />
              {end}
            </span>
          );
        })}
      </pre>
    </figure>
  );
}
