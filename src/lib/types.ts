export interface OpenApiFile {
  fsPath: string;
  title: string;
  version: string;
  servers: string[];
  endpoints: Endpoint[];
}

export interface Endpoint {
  method: string;
  path: string;
  summary?: string;
  operationId?: string;
  parameters: Parameter[];
  requestBody?: RequestBodySpec;
  responses: Record<string, ResponseSpec>;
  tags?: string[];
}

export interface Parameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  description?: string;
  schema?: SchemaObject;
}

export interface RequestBodySpec {
  required: boolean;
  content: Record<string, { schema?: SchemaObject }>;
}

export interface ResponseSpec {
  description?: string;
  content?: Record<string, { schema?: SchemaObject }>;
}

export interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  enum?: unknown[];
  description?: string;
  example?: unknown;
  $ref?: string;
}

export interface AuthPreset {
  id: string;
  name: string;
  type: "bearer" | "apikey";
  value: string;
  headerName?: string;
}

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  durationMs: number;
}

export type WebviewMessage =
  | { type: "sendRequest"; request: HttpRequest }
  | { type: "saveAuthPreset"; preset: Omit<AuthPreset, "id"> }
  | { type: "deleteAuthPreset"; id: string }
  | { type: "getAuthPresets" }
  | { type: "copySnippet"; format: "curl" | "fetch" | "axios"; request: HttpRequest };

export type ExtensionMessage =
  | { type: "response"; response: HttpResponse }
  | { type: "authPresets"; presets: AuthPreset[] }
  | { type: "loadEndpoint"; endpoint: Endpoint; file: OpenApiFile }
  | { type: "error"; message: string };
