"use client";

import { useSyncExternalStore } from "react";
import { openSearch } from "@/components/SearchPalette";

const noop = () => () => {};

/** The 404 terminal: `open` the path that was asked for, and why it may be missing. The path is known in the browser only. */
export function MissingPage() {
  const path = useSyncExternalStore(
    noop,
    () => location.pathname,
    () => "",
  );
  return (
    <figure className="wl-term" style={{ margin: 0 }}>
      <div className="wl-term__bar">
        <span>~/wowlua.dev</span>
        <span>404</span>
      </div>
      <pre className="wl-term__body">
        <span className="wl-term__prompt">$</span> <span className="wl-term__cmd">open {path}</span>
        {"\n"}
        <span className="wl-term__out">
          <span style={{ color: "var(--error)", fontWeight: 600 }}>no such page</span>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>: {path}</span>
        </span>
        {"\n"}
        <span className="wl-term__out">{"   = the page may have moved when the docs were reorganized,"}</span>
        {"\n"}
        <span className="wl-term__out">{"     or the link points at an older version of the docs"}</span>
      </pre>
    </figure>
  );
}

/** A "search the docs" field that opens the search palette when clicked or typed into. */
export function SearchField() {
  return (
    <div className="wl-field not-found__field">
      <label className="wl-field__label" htmlFor="nf-q">
        search the docs
      </label>
      <div className="wl-input">
        <span className="wl-input__prefix" aria-hidden="true">
          /
        </span>
        <input
          className="wl-input__control"
          id="nf-q"
          readOnly
          placeholder="a command, module or diagnostic code"
          onClick={() => openSearch()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey)) {
              e.preventDefault();
              openSearch();
            }
          }}
        />
      </div>
    </div>
  );
}
