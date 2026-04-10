<script lang="ts">
  import { onMount } from "svelte";
  import { post, onMessage } from "./vscode";
  import { store } from "./state.ts";
  import type { AppStore } from "./state.ts";
  import RequestPanel from "./components/RequestPanel.svelte";
  import ResponsePanel from "./components/ResponsePanel.svelte";
  import AuthModal from "./components/AuthModal.svelte";

  const s: AppStore = $state(store);

  let showAuth = $state(false);
  let tab = $state<"endpoint" | "custom">("custom");

  onMount(() => {
    post({ type: "getAuthPresets" });

    return onMessage((msg) => {
      if (msg.type === "response") {
        s.response.data = msg.response;
        s.response.loading = false;
        s.response.error = null;
      } else if (msg.type === "error") {
        s.response.error = msg.message;
        s.response.loading = false;
        s.response.data = null;
      } else if (msg.type === "authPresets") {
        s.authPresets = msg.presets;
      } else if (msg.type === "loadEndpoint") {
        s.activeEndpoint = { endpoint: msg.endpoint, file: msg.file };
        tab = "endpoint";
      }
    });
  });
</script>

<div class="app">
  <header>
    <div class="tabs">
      <button class:active={tab === "custom"} onclick={() => (tab = "custom")}>Custom</button>
      <button class:active={tab === "endpoint"} onclick={() => (tab = "endpoint")} disabled={!s.activeEndpoint}>
        {s.activeEndpoint ? `${s.activeEndpoint.endpoint.method} ${s.activeEndpoint.endpoint.path}` : "Endpoint"}
      </button>
    </div>
    <button class="auth-btn" onclick={() => (showAuth = true)}>Auth</button>
  </header>

  <div class="panels">
    <RequestPanel {tab} {s} />
    <div class="divider"></div>
    <ResponsePanel {s} />
  </div>

  {#if showAuth}
    <AuthModal onclose={() => (showAuth = false)} {s} />
  {/if}
</div>
