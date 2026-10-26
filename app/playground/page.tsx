import type { Metadata } from "next";
import { Playground } from "@/components/playground/Playground";
import { ogMetadata } from "@/lib/og";
import { playgroundExamples } from "@/lib/playground";

const description = "Write wowlua in the browser: see the Lua it compiles to, its problems and what it prints, and run it in the game with Blizzard's UI.";

export const metadata: Metadata = {
  title: "Playground",
  description,
  ...ogMetadata("/playground", "Playground", description),
};

export default function PlaygroundPage() {
  // wowlua's examples/playground/ on main: the picker's programs (lib/playground.ts).
  return <Playground examples={playgroundExamples()} />;
}
