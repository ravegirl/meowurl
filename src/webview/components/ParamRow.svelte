<script lang="ts">
  import type { Parameter } from "../../lib/types";

  let { param, value, onchange } = $props<{
    param: Parameter;
    value: string;
    onchange: (v: string) => void;
  }>();
</script>

<div class="kv-row param-row">
  <span class="param-name" title={param.description}>
    {param.name}
    {#if param.required}<span class="required">*</span>{/if}
  </span>
  <input
    {value}
    oninput={(e) => onchange((e.target as HTMLInputElement).value)}
    placeholder={param.schema?.example?.toString() ?? param.schema?.type ?? ""}
  />
</div>
