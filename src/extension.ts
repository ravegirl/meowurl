import * as vscode from "vscode";
import * as path from "path";
import { parseOpenApiFile } from "./lib/parser";
import { executeRequest } from "./lib/http";
import { AuthPresetManager } from "./lib/auth";
import { EndpointTreeProvider, EndpointNode } from "./lib/tree";
import { toCurl, toFetch, toAxios } from "./lib/snippets";
import type { WebviewMessage, ExtensionMessage, OpenApiFile } from "./lib/types";

let panel: vscode.WebviewPanel | undefined;
let webviewView: vscode.WebviewView | undefined;

export function activate(ctx: vscode.ExtensionContext) {
  const auth = new AuthPresetManager(ctx.secrets);
  const treeProvider = new EndpointTreeProvider();

  vscode.window.registerTreeDataProvider("meowurl.endpointTree", treeProvider);

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider("meowurl.panelView", {
      resolveWebviewView(view) {
        webviewView = view;
        setupWebview(view.webview, ctx, auth);
      },
    }),
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand("meowurl.open", () => openPanel(ctx, auth)),
    vscode.commands.registerCommand("meowurl.openPanel", () => openPanel(ctx, auth)),
    vscode.commands.registerCommand("meowurl.openEndpoint", (endpoint, file: OpenApiFile) => {
      const wv = getActiveWebview();
      if (!wv) {
        openPanel(ctx, auth).then(() => {
          sendToWebview({ type: "loadEndpoint", endpoint, file });
        });
      } else {
        sendToWebview({ type: "loadEndpoint", endpoint, file });
      }
    }),
  );

  loadOpenApiFiles(ctx, treeProvider);

  const watcher = vscode.workspace.createFileSystemWatcher("**/{openapi,swagger}.{json,yaml,yml}");
  watcher.onDidCreate(() => loadOpenApiFiles(ctx, treeProvider));
  watcher.onDidChange(() => loadOpenApiFiles(ctx, treeProvider));
  watcher.onDidDelete(() => loadOpenApiFiles(ctx, treeProvider));
  ctx.subscriptions.push(watcher);
}

function getActiveWebview(): vscode.Webview | undefined {
  if (panel?.visible) return panel.webview;
  if (webviewView) return webviewView.webview;
  return undefined;
}

function sendToWebview(msg: ExtensionMessage) {
  if (panel?.visible) panel.webview.postMessage(msg);
  else if (webviewView) webviewView.webview.postMessage(msg);
}

async function openPanel(ctx: vscode.ExtensionContext, auth: AuthPresetManager): Promise<void> {
  if (panel) {
    panel.reveal();
    return;
  }

  panel = vscode.window.createWebviewPanel(
    "meowurl",
    "meowurl",
    vscode.ViewColumn.One,
    { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(ctx.extensionUri, "dist", "webview")] },
  );

  setupWebview(panel.webview, ctx, auth);

  panel.onDidDispose(() => { panel = undefined; });
}

function setupWebview(webview: vscode.Webview, ctx: vscode.ExtensionContext, auth: AuthPresetManager) {
  webview.options = {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(ctx.extensionUri, "dist", "webview")],
  };
  webview.html = getHtml(webview, ctx);

  webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
    switch (msg.type) {
      case "sendRequest": {
        try {
          const response = await executeRequest(msg.request);
          webview.postMessage({ type: "response", response } satisfies ExtensionMessage);
        } catch (err) {
          webview.postMessage({ type: "error", message: (err as Error).message } satisfies ExtensionMessage);
        }
        break;
      }
      case "getAuthPresets": {
        const presets = await auth.getAll();
        webview.postMessage({ type: "authPresets", presets } satisfies ExtensionMessage);
        break;
      }
      case "saveAuthPreset": {
        await auth.save(msg.preset);
        const presets = await auth.getAll();
        webview.postMessage({ type: "authPresets", presets } satisfies ExtensionMessage);
        break;
      }
      case "deleteAuthPreset": {
        await auth.delete(msg.id);
        const presets = await auth.getAll();
        webview.postMessage({ type: "authPresets", presets } satisfies ExtensionMessage);
        break;
      }
      case "copySnippet": {
        const snippetMap = { curl: toCurl, fetch: toFetch, axios: toAxios };
        const snippet = snippetMap[msg.format](msg.request);
        await vscode.env.clipboard.writeText(snippet);
        vscode.window.showInformationMessage(`${msg.format} snippet copied`);
        break;
      }
    }
  });
}

function getHtml(webview: vscode.Webview, ctx: vscode.ExtensionContext): string {
  const base = vscode.Uri.joinPath(ctx.extensionUri, "dist", "webview");
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(base, "main.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(base, "main.css"));
  const nonce = crypto.randomUUID().replace(/-/g, "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <link rel="stylesheet" href="${styleUri}" />
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

async function loadOpenApiFiles(ctx: vscode.ExtensionContext, tree: EndpointTreeProvider) {
  const uris = await vscode.workspace.findFiles("**/{openapi,swagger}.{json,yaml,yml}", "**/node_modules/**");
  const files: OpenApiFile[] = [];

  for (const uri of uris) {
    try {
      files.push(await parseOpenApiFile(uri));
    } catch {
      // skip unparseable files silently
    }
  }

  tree.refresh(files);
  ctx.workspaceState.update("meowurl.openApiFiles", files);
}

export function deactivate() {}
