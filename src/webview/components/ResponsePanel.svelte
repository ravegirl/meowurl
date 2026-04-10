<script lang="ts">
  import type { AppStore } from "../state.ts";

  let { s } = $props<{ s: AppStore }>();

  type Lang = "json" | "html" | "xml" | "text";
  type Token = { type: string; text: string };

  function detectLang(contentType: string): Lang {
    if (contentType.includes("json")) return "json";
    if (contentType.includes("html")) return "html";
    if (contentType.includes("xml")) return "xml";
    return "text";
  }

  function prettyJson(body: string): string {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }

  function statusClass(status: number): string {
    if (status < 300) return "ok";
    if (status < 400) return "redirect";
    if (status < 500) return "client-err";
    return "server-err";
  }

  /** Lightweight JSON tokenizer for syntax highlighting */
  function tokenizeJson(src: string): Token[] {
    const out: Token[] = [];
    const re =
      /("(?:[^"\\]|\\.)*")(\s*:)|(true|false|null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|("(?:[^"\\]|\\.)*")|([{}[\],])|(\s+|.)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      if (m[1]) {
        out.push({ type: "key", text: m[1] });
        out.push({ type: "colon", text: m[2] });
      } else if (m[3]) out.push({ type: "literal", text: m[3] });
      else if (m[4]) out.push({ type: "number", text: m[4] });
      else if (m[5]) out.push({ type: "string", text: m[5] });
      else if (m[6]) out.push({ type: "punct", text: m[6] });
      else out.push({ type: "ws", text: m[7] ?? "" });
    }
    return out;
  }

  function getTokens(body: string): Token[] {
    return tokenizeJson(prettyJson(body));
  }

  function headerEntries(headers: Record<string, string>): [string, string][] {
    return Object.entries(headers);
  }
</script>

<div class="panel response-panel">
  {#if s.response.loading}
    <div class="placeholder">Sending…</div>
  {:else if s.response.error}
    <div class="error-msg">{s.response.error}</div>
  {:else if s.response.data}
    {@const data = s.response.data}
    {@const lang = detectLang(data.contentType)}
    <div class="response-meta">
      <span class="status {statusClass(data.status)}"
        >{data.status} {data.statusText}</span
      >
      <span class="duration">{data.durationMs}ms</span>
      <span class="ct">{data.contentType}</span>
    </div>

    <div class="response-body">
      {#if lang === "html"}
        <iframe srcdoc={data.body} sandbox="allow-same-origin" title="response"
        ></iframe>
      {:else if lang === "json"}
        <pre class="code json">{#each getTokens(data.body) as t (t)}<span
              class="t-{t.type}">{t.text}</span
            >{/each}</pre>
      {:else}
        <pre class="code">{data.body}</pre>
      {/if}
    </div>

    <details class="headers-detail">
      <summary>Response Headers</summary>
      <table>
        <tbody>
          {#each headerEntries(data.headers) as [k, v] (k)}
            <tr><td class="hk">{k}</td><td>{v}</td></tr>
          {/each}
        </tbody>
      </table>
    </details>
  {:else}
    <div class="placeholder">Response will appear here</div>
  {/if}
</div>
