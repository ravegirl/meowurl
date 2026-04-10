<script lang="ts">
  import { post } from "../vscode";
  import type { AppStore } from "../state.ts";

  let { onclose, s } = $props<{ onclose: () => void; s: AppStore }>();

  let name = $state("");
  let type = $state<"bearer" | "apikey">("bearer");
  let value = $state("");
  let headerName = $state("X-API-Key");

  function save() {
    if (!name.trim() || !value.trim()) return;
    post({
      type: "saveAuthPreset",
      preset: {
        name: name.trim(),
        type,
        value: value.trim(),
        headerName: headerName.trim() || undefined,
      },
    });
    name = "";
    value = "";
  }

  function remove(id: string) {
    post({ type: "deleteAuthPreset", id });
  }
</script>

<div
  class="modal-backdrop"
  role="presentation"
  onclick={onclose}
  onkeydown={onclose}
>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <div class="modal-header">
      <span>Auth Presets</span>
      <button onclick={onclose}>×</button>
    </div>

    <ul class="preset-list">
      {#each s.authPresets as p (p.id)}
        <li>
          <span class="preset-name">{p.name}</span>
          <span class="preset-type">{p.type}</span>
          <button onclick={() => remove(p.id)}>×</button>
        </li>
      {:else}
        <li class="empty">No presets saved</li>
      {/each}
    </ul>

    <div class="modal-form">
      <input bind:value={name} placeholder="Name (e.g. prod key)" />
      <select bind:value={type}>
        <option value="bearer">Bearer Token</option>
        <option value="apikey">API Key</option>
      </select>
      {#if type === "apikey"}
        <input
          bind:value={headerName}
          placeholder="Header name (e.g. X-API-Key)"
        />
      {/if}
      <input bind:value type="password" placeholder="Token / Key value" />
      <button onclick={save} disabled={!name.trim() || !value.trim()}
        >Save</button
      >
    </div>
  </div>
</div>
