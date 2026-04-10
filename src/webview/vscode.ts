import type { WebviewMessage, ExtensionMessage } from "../lib/types";

declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

/** Posts a typed message to the extension host. */
export function post(msg: WebviewMessage) {
  vscode.postMessage(msg);
}

/** Registers a handler for messages arriving from the extension host. */
export function onMessage(handler: (msg: ExtensionMessage) => void): () => void {
  const listener = (e: MessageEvent) => handler(e.data as ExtensionMessage);
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
