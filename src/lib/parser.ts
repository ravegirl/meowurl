import * as vscode from "vscode";
import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPI, OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import type { OpenApiFile, Endpoint, Parameter, RequestBodySpec, SchemaObject } from "./types";

/**
 * Loads and fully dereferences an OpenAPI 3.x spec from a workspace file URI.
 */
export async function parseOpenApiFile(uri: vscode.Uri): Promise<OpenApiFile> {
  const api = await SwaggerParser.dereference(uri.fsPath) as OpenAPIV3.Document | OpenAPIV3_1.Document;

  const info = api.info;
  const servers = (api.servers ?? []).map((s) => s.url).filter(Boolean);
  const endpoints = parsePaths(api);

  return {
    fsPath: uri.fsPath,
    title: info.title ?? "Untitled",
    version: info.version ?? "0.0.0",
    servers,
    endpoints,
  };
}

function parsePaths(api: OpenAPIV3.Document | OpenAPIV3_1.Document): Endpoint[] {
  const endpoints: Endpoint[] = [];
  const methods = ["get", "post", "put", "patch", "delete", "options", "head"] as const;

  for (const [path, item] of Object.entries(api.paths ?? {})) {
    if (!item) continue;
    for (const method of methods) {
      const op = item[method] as OpenAPIV3.OperationObject | undefined;
      if (!op) continue;

      endpoints.push({
        method: method.toUpperCase(),
        path,
        summary: op.summary,
        operationId: op.operationId,
        tags: op.tags,
        parameters: parseParameters(op),
        requestBody: parseRequestBody(op),
        responses: {},
      });
    }
  }

  return endpoints;
}

function parseParameters(op: OpenAPIV3.OperationObject): Parameter[] {
  return (op.parameters ?? []).map((p) => {
    const param = p as OpenAPIV3.ParameterObject;
    return {
      name: param.name,
      in: param.in as Parameter["in"],
      required: param.required ?? false,
      description: param.description,
      schema: param.schema as SchemaObject | undefined,
    };
  });
}

function parseRequestBody(op: OpenAPIV3.OperationObject): RequestBodySpec | undefined {
  const rb = op.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  if (!rb) return undefined;

  const content: RequestBodySpec["content"] = {};
  for (const [contentType, media] of Object.entries(rb.content ?? {})) {
    const m = media as OpenAPIV3.MediaTypeObject;
    content[contentType] = { schema: m.schema as SchemaObject | undefined };
  }

  return { required: rb.required ?? false, content };
}
