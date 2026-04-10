import type { HttpRequest } from "./types";

/** Generates a curl command string for the given request. */
export function toCurl(req: HttpRequest): string {
  const headers = Object.entries(req.headers)
    .map(([k, v]) => `-H '${k}: ${v}'`)
    .join(" \\\n  ");

  const body = req.body ? `-d '${req.body.replace(/'/g, "'\\''")}' \\\n  ` : "";

  return `curl -X ${req.method} \\\n  ${headers}${headers ? " \\\n  " : ""}${body}'${req.url}'`;
}

/** Generates a native fetch() call for the given request. */
export function toFetch(req: HttpRequest): string {
  const opts: Record<string, unknown> = { method: req.method, headers: req.headers };
  if (req.body) opts.body = req.body;
  const optsStr = JSON.stringify(opts, null, 2);
  return `const res = await fetch('${req.url}', ${optsStr});\nconst data = await res.json();`;
}

/** Generates an axios call for the given request. */
export function toAxios(req: HttpRequest): string {
  const config: Record<string, unknown> = { headers: req.headers };
  if (req.body) config.data = req.body;
  const configStr = JSON.stringify(config, null, 2);
  return `const { data } = await axios.${req.method.toLowerCase()}('${req.url}', ${configStr});`;
}
