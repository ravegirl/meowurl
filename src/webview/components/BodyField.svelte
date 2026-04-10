<script lang="ts">
  import type { SchemaObject } from "../../lib/types";

  let {
    name,
    schema,
    value,
    onchange,
    depth = 0,
  } = $props<{
    name: string;
    schema: SchemaObject;
    value: unknown;
    onchange: (v: unknown) => void;
    depth?: number;
  }>();

  const type = $derived(schema.type ?? inferType(value));

  function inferType(v: unknown): string {
    if (v === null || v === undefined) return "string";
    if (typeof v === "boolean") return "boolean";
    if (typeof v === "number") return "number";
    if (Array.isArray(v)) return "array";
    if (typeof v === "object") return "object";
    return "string";
  }

  function initObject(): Record<string, unknown> {
    const base =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? { ...(value as Record<string, unknown>) }
        : {};
    if (schema.properties) {
      for (const [k, s] of Object.entries(schema.properties)) {
        if (!(k in base)) base[k] = s.example ?? defaultFor(s);
      }
    }
    return base;
  }

  function initArray(): unknown[] {
    return Array.isArray(value) ? [...value] : [];
  }

  function defaultFor(s: SchemaObject): unknown {
    if (s.example != null) return s.example;
    if (s.enum?.length) return s.enum[0];
    if (s.type === "boolean") return false;
    if (s.type === "integer" || s.type === "number") return 0;
    if (s.type === "array") return [];
    if (s.type === "object") return {};
    return "";
  }

  function setObjectKey(key: string, v: unknown) {
    const obj = initObject();
    obj[key] = v;
    onchange(obj);
  }

  function setArrayItem(i: number, v: unknown) {
    const arr = initArray();
    arr[i] = v;
    onchange(arr);
  }

  function addArrayItem() {
    const arr = initArray();
    arr.push(defaultFor(schema.items ?? {}));
    onchange(arr);
  }

  function removeArrayItem(i: number) {
    const arr = initArray();
    arr.splice(i, 1);
    onchange(arr);
  }
</script>

<div class="body-field" style="--depth: {depth}">
  {#if schema.enum?.length}
    <div class="kv-row param-row">
      <span class="param-name">{name}</span>
      <select
        value={String(value ?? schema.enum[0])}
        onchange={(e) => onchange((e.target as HTMLSelectElement).value)}
      >
        {#each schema.enum as opt}
          <option value={String(opt)}>{String(opt)}</option>
        {/each}
      </select>
    </div>
  {:else if type === "boolean"}
    <div class="kv-row param-row">
      <span class="param-name">{name}</span>
      <label class="toggle">
        <input
          type="checkbox"
          checked={value === true}
          onchange={(e) => onchange((e.target as HTMLInputElement).checked)}
        />
        <span>{value === true ? "true" : "false"}</span>
      </label>
    </div>
  {:else if type === "integer" || type === "number"}
    <div class="kv-row param-row">
      <span class="param-name">{name}</span>
      <input
        type="number"
        value={value != null ? String(value) : ""}
        oninput={(e) => onchange(Number((e.target as HTMLInputElement).value))}
        placeholder={schema.description ?? type}
      />
    </div>
  {:else if type === "object" && schema.properties}
    <div class="kv-row param-row">
      <span class="param-name object-name">{name}</span>
    </div>
    <div class="object-children">
      {#each Object.entries(schema.properties) as [k, s] (k)}
        <svelte:self
          name={k}
          schema={s}
          value={initObject()[k]}
          onchange={(v) => setObjectKey(k, v)}
          depth={depth + 1}
        />
      {/each}
    </div>
  {:else if type === "array"}
    <div class="kv-row param-row">
      <span class="param-name">{name}</span>
      <button class="add-btn" onclick={addArrayItem}>+</button>
    </div>
    {#each initArray() as item, i}
      <div class="array-item">
        <svelte:self
          name={String(i)}
          schema={schema.items ?? { type: "string" }}
          value={item}
          onchange={(v) => setArrayItem(i, v)}
          depth={depth + 1}
        />
        <button class="remove-btn" onclick={() => removeArrayItem(i)}>×</button>
      </div>
    {/each}
  {:else}
    <div class="kv-row param-row">
      <span class="param-name">{name}</span>
      <input
        value={value != null ? String(value) : ""}
        oninput={(e) => onchange((e.target as HTMLInputElement).value)}
        placeholder={schema.description ?? schema.format ?? "string"}
      />
    </div>
  {/if}
</div>
