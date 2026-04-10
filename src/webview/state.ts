import type { OpenApiFile, HttpResponse, AuthPreset, Endpoint } from "../lib/types";

export interface AppStore {
  activeEndpoint: { endpoint: Endpoint; file: OpenApiFile } | null;
  response: { data: HttpResponse | null; error: string | null; loading: boolean };
  authPresets: AuthPreset[];
}

export const store: AppStore = {
  activeEndpoint: null,
  response: { data: null, error: null, loading: false },
  authPresets: [],
};
