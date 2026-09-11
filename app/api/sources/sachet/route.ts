const feedUrl = "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml";
const northEast = ["Nagaland", "Assam", "Manipur", "Meghalaya", "Mizoram", "Tripura", "Arunachal", "Sikkim", "Kohima", "Dimapur"];

export const dynamic = "force-dynamic";

type Alert = { title: string; category: string; source: string; publishedAt: string; link: string };

function tag(item: string, name: string): string {
  const match = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return (match?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

export async function GET() {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(feedUrl, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!response.ok) throw new Error(`SACHET responded ${response.status}`);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
    const alerts: Alert[] = items.map((item) => ({
      title: tag(item, "title"),
      category: tag(item, "category"),
      source: tag(item, "author").replace(/^[^(]*\(|\)$/g, ""),
      publishedAt: tag(item, "pubDate"),
      link: tag(item, "link"),
    }));
    const regional = alerts.filter((alert) => northEast.some((name) => alert.title.includes(name) || alert.source.includes(name)));
    return Response.json({
      ok: true,
      feed: "SACHET (NDMA) CAP alert feed — all India",
      fetchedAt,
      total: alerts.length,
      northEast: regional.length,
      nagaland: regional.filter((alert) => /Nagaland|Kohima|Dimapur/.test(`${alert.title} ${alert.source}`)).length,
      latest: regional.slice(0, 5),
    });
  } catch (error) {
    return Response.json({ ok: false, feed: "SACHET (NDMA) CAP alert feed — all India", fetchedAt, error: error instanceof Error ? error.message : String(error) }, { status: 200 });
  }
}
