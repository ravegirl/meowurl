import type { HttpRequest, HttpResponse } from "./types";

/**
 * Executes an HTTP request from the extension host and returns a structured response.
 * Runs in Node context so there are no CORS restrictions.
 */
export async function executeRequest(req: HttpRequest): Promise<HttpResponse> {
  const start = Date.now();

  const options: RequestInit = {
    method: req.method,
    headers: req.headers,
  };

  if (req.body && !["GET", "HEAD"].includes(req.method.toUpperCase())) {
    options.body = req.body;
  }

  let res: Response;
  try {
    res = await fetch(req.url, options);
  } catch (err) {
    throw new Error(`Network error: ${(err as Error).message}`);
  }

  const durationMs = Date.now() - start;
  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();

  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => { headers[key] = value; });

  return {
    status: res.status,
    statusText: res.statusText,
    headers,
    body,
    contentType,
    durationMs,
  };
}
