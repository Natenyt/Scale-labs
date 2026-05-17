/**
 * Dev proxy: forward /api/v1/* from Next to Django with a trailing slash on every path.
 * Next rewrites strip trailing slashes and break Django APPEND_SLASH on POST.
 */
const DJANGO_DEV_URL = (
  process.env.DJANGO_DEV_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

function buildDjangoUrl(segments: string[], search: string): string {
  const tail = segments.length > 0 ? `${segments.join("/")}/` : "";
  return `${DJANGO_DEV_URL}/api/v1/${tail}${search}`;
}

const FORWARD_HEADERS = [
  "authorization",
  "content-type",
  "x-org-id",
  "accept",
  "accept-language",
];

/** Forward Vapi tool webhook headers when /api/v1/webhooks/* is proxied through Next. */
function forwardProxyHeaders(incoming: Request): Headers {
  const headers = new Headers();
  incoming.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      FORWARD_HEADERS.includes(lower) ||
      lower.startsWith("x-")
    ) {
      headers.set(key, value);
    }
  });
  return headers;
}

export async function proxyToDjango(
  request: Request,
  segments: string[],
): Promise<Response> {
  const incoming = new URL(request.url);
  const target = buildDjangoUrl(segments, incoming.search);

  const headers = forwardProxyHeaders(request);

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);

  const outHeaders = new Headers(upstream.headers);
  outHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}
