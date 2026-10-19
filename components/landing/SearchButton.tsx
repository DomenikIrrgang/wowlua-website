"use client";

import { openSearch } from "@/components/SearchPalette";

/** A wide "search the docs" field that opens the search palette; the 404 page shows it on phones. */
export function SearchButton({ className }: { className?: string }) {
  return (
    <button className={className} type="button" onClick={() => openSearch()}>
      <span aria-hidden="true">/</span>search the docs
    </button>
  );
}
