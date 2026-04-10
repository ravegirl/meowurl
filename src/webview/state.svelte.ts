import type { Endpoint, OpenApiFile, HttpResponse, AuthPreset } from "../lib/types";

export const store = $state({
  activeEndpoint: null as { endpoint: Endpoint; file: OpenApiFile } | null,
  response: {
    data: null as HttpResponse | null,
    error: null as string | null,
    loading: false,
  },
  authPresets: [] as AuthPreset[],
});
