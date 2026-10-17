import { renderCard } from "@/lib/og";
import { ogCard, ogPaths } from "@/lib/og-cards";

// Every card is rendered at build time: /og/image.png for the home page,
// /og/<page path>/image.png for the others.
export const dynamic = "force-static";
export const dynamicParams = false;

type Params = { path: string[] };

export function generateStaticParams(): Params[] {
  return ogPaths().map((p) => ({ path: [...p.split("/").filter(Boolean), "image.png"] }));
}

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  const { path } = await params;
  const card = path.at(-1) === "image.png" ? await ogCard("/" + path.slice(0, -1).join("/")) : null;
  if (!card) return new Response("Not found", { status: 404 });
  return renderCard(card);
}
