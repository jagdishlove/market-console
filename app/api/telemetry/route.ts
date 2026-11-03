export async function POST(req: Request) {
  const body: unknown = await req.text().then((t) => JSON.parse(t)).catch(() => null);
  if (body) console.info("[telemetry]", JSON.stringify(body));
  return new Response(null, { status: 204 });
}
