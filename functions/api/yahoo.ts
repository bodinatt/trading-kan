// Cloudflare Pages Function — proxies Yahoo Finance API to bypass CORS
const YAHOO_BASE = 'https://query1.finance.yahoo.com';

interface Env {}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const endpoint = url.searchParams.get('endpoint');

  if (!endpoint) {
    return new Response(JSON.stringify({ error: 'Missing endpoint param' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only allow specific Yahoo Finance endpoints
  const allowed = ['/v8/finance/chart/', '/v1/finance/search'];
  if (!allowed.some((a) => endpoint.startsWith(a))) {
    return new Response(JSON.stringify({ error: 'Endpoint not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build the full Yahoo URL, forwarding remaining query params
  const yahooUrl = new URL(endpoint, YAHOO_BASE);
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'endpoint') {
      yahooUrl.searchParams.set(key, value);
    }
  }

  try {
    const resp = await fetch(yahooUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const data = await resp.text();

    return new Response(data, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
