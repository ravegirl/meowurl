<script lang="ts">
  import { post } from "../vscode";
  import type { AppStore } from "../state.ts";
  import type { HttpRequest, SchemaObject } from "../../lib/types";
  import ParamRow from "./ParamRow.svelte";
  import BodyField from "./BodyField.svelte";

  let { tab, s } = $props<{ tab: "endpoint" | "custom"; s: AppStore }>();

  let method = $state("GET");
  let url = $state("");
  let extraHeaders = $state<{ key: string; value: string }[]>([]);
  let rawBody = $state("");
  let bodyValues = $state<Record<string, unknown>>({});
  let selectedPresetId = $state<string | null>(null);
  let snippetFormat = $state<"curl" | "fetch" | "axios">("curl");
  let paramValues = $state<Record<string, string>>({});
  let queryExtra = $state<{ key: string; value: string }[]>([]);

  let lastEndpointId = "";

  function getBodySchema(ep: typeof s.activeEndpoint) {
    const content = ep?.endpoint.requestBody?.content;
    if (!content) return null;
    const preferred =
      content["application/json"] ??
      content["*/*"] ??
      Object.values(content)[0];
    return preferred?.schema ?? null;
  }

  const bodySchema = $derived(
    tab === "endpoint" ? getBodySchema(s.activeEndpoint) : null,
  );

  /** Returns true when the endpoint has a structured JSON schema we can render as fields. */
  const hasStructuredBody = $derived(
    bodySchema !== null &&
      (!!bodySchema.properties || bodySchema.type === "object"),
  );

  $effect(() => {
    const ep = s.activeEndpoint?.endpoint;
    if (!ep || tab !== "endpoint") return;
    const id = `${ep.method}:${ep.path}`;
    if (id === lastEndpointId) return;
    lastEndpointId = id;

    const fresh: Record<string, string> = {};
    for (const p of ep.parameters) {
      fresh[p.name] = p.schema?.example != null ? String(p.schema.example) : "";
    }
    paramValues = fresh;

    const schema = ep.requestBody?.content["application/json"]?.schema;
    if (!schema) {
      bodyValues = {};
      rawBody = "";
      return;
    }

    if (schema.example != null) {
      const ex = schema.example;
      if (typeof ex === "object" && ex !== null) {
        bodyValues = ex as Record<string, unknown>;
      } else {
        rawBody = String(ex);
      }
    } else if (schema.properties) {
      const init: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(schema.properties)) {
        init[k] = v.example ?? defaultFor(v);
      }
      bodyValues = init;
    } else {
      bodyValues = {};
      rawBody = "";
    }
  });

  function defaultFor(s: SchemaObject): unknown {
    if (s.enum?.length) return s.enum[0];
    if (s.type === "boolean") return false;
    if (s.type === "integer" || s.type === "number") return 0;
    if (s.type === "array") return [];
    if (s.type === "object") return {};
    return "";
  }

  function serializeBody(): string | undefined {
    const activeMethod =
      tab === "endpoint"
        ? (s.activeEndpoint?.endpoint.method ?? method)
        : method;
    if (["GET", "HEAD"].includes(activeMethod)) return undefined;
    if (hasStructuredBody) return JSON.stringify(bodyValues);
    return rawBody || undefined;
  }

  function resolveUrl(): string {
    const ep = s.activeEndpoint;
    if (tab !== "endpoint" || !ep) return url;
    const base = ep.file.servers[0] ?? "";
    let p = ep.endpoint.path;

    const inPath = new Set<string>();
    for (const param of ep.endpoint.parameters) {
      if (p.includes(`{${param.name}}`)) {
        const v = paramValues[param.name] ?? "";
        p = p.replace(
          `{${param.name}}`,
          v ? encodeURIComponent(v) : `{${param.name}}`,
        );
        inPath.add(param.name);
      }
    }

    const qps = [
      ...ep.endpoint.parameters
        .filter((param) => !inPath.has(param.name) && param.in === "query")
        .map((param) => {
          const v = paramValues[param.name] ?? "";
          return v ? `${param.name}=${encodeURIComponent(v)}` : null;
        }),
      ...queryExtra.map((row) =>
        row.key && row.value
          ? `${row.key}=${encodeURIComponent(row.value)}`
          : null,
      ),
    ].filter((x): x is string => x !== null);
    return `${base}${p}${qps.length ? `?${qps.join("&")}` : ""}`;
  }

  function buildRequest(): HttpRequest {
    const allHeaders: Record<string, string> = {};

    if (tab === "endpoint" && s.activeEndpoint) {
      for (const param of s.activeEndpoint.endpoint.parameters.filter(
        (p) => p.in === "header",
      )) {
        const v = paramValues[param.name] ?? "";
        if (v) allHeaders[param.name] = v;
      }
      if (hasStructuredBody) allHeaders["Content-Type"] = "application/json";
    }

    for (const h of extraHeaders) {
      if (h.key) allHeaders[h.key] = h.value;
    }

    const preset = s.authPresets.find((p) => p.id === selectedPresetId);
    if (preset) {
      if (preset.type === "bearer")
        allHeaders["Authorization"] = `Bearer ${preset.value}`;
      else allHeaders[preset.headerName ?? "X-API-Key"] = preset.value;
    }

    const ep = s.activeEndpoint;
    return {
      method: tab === "endpoint" ? (ep?.endpoint.method ?? method) : method,
      url: resolveUrl(),
      headers: allHeaders,
      body: serializeBody(),
    };
  }

  function send() {
    s.response.loading = true;
    s.response.data = null;
    s.response.error = null;
    post({ type: "sendRequest", request: buildRequest() });
  }

  function copySnippet() {
    post({
      type: "copySnippet",
      format: snippetFormat,
      request: buildRequest(),
    });
  }
</script>

<div class="panel request-panel">
  {#if tab === "custom"}
    <div class="url-row">
      <select bind:value={method}>
        {#each ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as m}
          <option>{m}</option>
        {/each}
      </select>
      <input bind:value={url} placeholder="https://..." />
    </div>
  {:else if s.activeEndpoint}
    {@const ep = s.activeEndpoint.endpoint}
    <div class="endpoint-header">
      <span class="badge {ep.method.toLowerCase()}">{ep.method}</span>
      <span class="path">{ep.path}</span>
      {#if ep.summary}<span class="summary">{ep.summary}</span>{/if}
    </div>
    <div class="resolved-url">{resolveUrl()}</div>
  {/if}

  <div class="auth-row">
    <label for="auth-select">Auth</label>
    <select id="auth-select" bind:value={selectedPresetId}>
      <option value={null}>None</option>
      {#each s.authPresets as p (p.id)}
        <option value={p.id}>{p.name}</option>
      {/each}
    </select>
  </div>

  {#if tab === "endpoint" && s.activeEndpoint}
    {@const _path = s.activeEndpoint.endpoint.path}
    {@const pathParams = s.activeEndpoint.endpoint.parameters.filter((p) =>
      _path.includes(`{${p.name}}`),
    )}
    {@const pathParamNames = new Set(pathParams.map((p) => p.name))}
    {@const queryParams = s.activeEndpoint.endpoint.parameters.filter(
      (p) => !pathParamNames.has(p.name) && p.in === "query",
    )}
    {@const headerParams = s.activeEndpoint.endpoint.parameters.filter(
      (p) => p.in === "header",
    )}
    {@const cookieParams = s.activeEndpoint.endpoint.parameters.filter(
      (p) => p.in === "cookie",
    )}

    {#if pathParams.length > 0}
      <section>
        <h4>Path</h4>
        {#each pathParams as param (param.name)}
          <ParamRow
            {param}
            value={paramValues[param.name] ?? ""}
            onchange={(v) => (paramValues[param.name] = v)}
          />
        {/each}
      </section>
    {/if}

    {#if queryParams.length > 0}
      <section>
        <h4>Query</h4>
        {#each queryParams as param (param.name)}
          <ParamRow
            {param}
            value={paramValues[param.name] ?? ""}
            onchange={(v) => (paramValues[param.name] = v)}
          />
        {/each}
      </section>
    {/if}

    {#if headerParams.length > 0}
      <section>
        <h4>Headers</h4>
        {#each headerParams as param (param.name)}
          <ParamRow
            {param}
            value={paramValues[param.name] ?? ""}
            onchange={(v) => (paramValues[param.name] = v)}
          />
        {/each}
      </section>
    {/if}

    {#if cookieParams.length > 0}
      <section>
        <h4>Cookies</h4>
        {#each cookieParams as param (param.name)}
          <ParamRow
            {param}
            value={paramValues[param.name] ?? ""}
            onchange={(v) => (paramValues[param.name] = v)}
          />
        {/each}
      </section>
    {/if}
  {/if}

  <section>
    <div class="section-header">
      <h4>Extra Headers</h4>
      <button
        class="add-btn"
        onclick={() => extraHeaders.push({ key: "", value: "" })}>+</button
      >
    </div>
    {#each extraHeaders as h, i}
      <div class="kv-row">
        <input bind:value={h.key} placeholder="Key" />
        <input bind:value={h.value} placeholder="Value" />
        <button onclick={() => extraHeaders.splice(i, 1)}>×</button>
      </div>
    {/each}
  </section>

  {#if tab === "custom"}
    <section>
      <div class="section-header">
        <h4>Query</h4>
        <button
          class="add-btn"
          onclick={() => queryExtra.push({ key: "", value: "" })}>+</button
        >
      </div>
      {#each queryExtra as row, i}
        <div class="kv-row">
          <input bind:value={row.key} placeholder="Key" />
          <input bind:value={row.value} placeholder="Value" />
          <button onclick={() => queryExtra.splice(i, 1)}>×</button>
        </div>
      {/each}
    </section>
  {/if}

  {#if !["GET", "HEAD"].includes(tab === "endpoint" ? (s.activeEndpoint?.endpoint.method ?? method) : method)}
    <section>
      <h4>Body</h4>
      {#if hasStructuredBody && bodySchema}
        <div class="body-fields">
          {#each Object.entries(bodySchema.properties ?? {}) as [k, schema] (k)}
            <BodyField
              name={k}
              {schema}
              value={bodyValues[k]}
              onchange={(v) => (bodyValues[k] = v)}
            />
          {/each}
        </div>
      {:else}
        <textarea
          bind:value={rawBody}
          rows={6}
          placeholder="Request body (JSON, etc.)"
        ></textarea>
      {/if}
    </section>
  {/if}

  <div class="actions">
    <button class="send-btn" onclick={send} disabled={s.response.loading}>
      {s.response.loading ? "Sending…" : "Send"}
    </button>
    <div class="snippet-group">
      <select bind:value={snippetFormat}>
        <option value="curl">curl</option>
        <option value="fetch">fetch</option>
        <option value="axios">axios</option>
      </select>
      <button onclick={copySnippet}>Copy</button>
    </div>
  </div>
</div>
