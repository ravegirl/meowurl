import * as vscode from "vscode";
import type { OpenApiFile, Endpoint } from "./types";

export class EndpointTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private files: OpenApiFile[] = [];

  refresh(files: OpenApiFile[]): void {
    this.files = files;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    return node;
  }

  getChildren(node?: TreeNode): TreeNode[] {
    if (!node) {
      return this.files.map((f) => new FileNode(f));
    }
    if (node instanceof FileNode) {
      const tags = groupByTag(node.file.endpoints);
      if (tags.size <= 1) {
        return node.file.endpoints.map((e) => new EndpointNode(e, node.file));
      }
      return Array.from(tags.entries()).map(([tag, eps]) => new TagNode(tag, eps, node.file));
    }
    if (node instanceof TagNode) {
      return node.endpoints.map((e) => new EndpointNode(e, node.file));
    }
    return [];
  }
}

function groupByTag(endpoints: Endpoint[]): Map<string, Endpoint[]> {
  const map = new Map<string, Endpoint[]>();
  for (const ep of endpoints) {
    const tag = ep.tags?.[0] ?? "default";
    const arr = map.get(tag) ?? [];
    arr.push(ep);
    map.set(tag, arr);
  }
  return map;
}

export type TreeNode = FileNode | TagNode | EndpointNode;

export class FileNode extends vscode.TreeItem {
  constructor(public readonly file: OpenApiFile) {
    super(file.title, vscode.TreeItemCollapsibleState.Collapsed);
    this.description = `v${file.version}`;
    this.tooltip = file.fsPath;
    this.contextValue = "meowurl.file";
  }
}

export class TagNode extends vscode.TreeItem {
  constructor(
    tag: string,
    public readonly endpoints: Endpoint[],
    public readonly file: OpenApiFile,
  ) {
    super(tag, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "meowurl.tag";
  }
}

export class EndpointNode extends vscode.TreeItem {
  constructor(
    public readonly endpoint: Endpoint,
    public readonly file: OpenApiFile,
  ) {
    super(endpoint.path, vscode.TreeItemCollapsibleState.None);
    this.description = endpoint.method;
    this.tooltip = endpoint.summary;
    this.contextValue = "meowurl.endpoint";
    this.command = {
      command: "meowurl.openEndpoint",
      title: "Open Endpoint",
      arguments: [endpoint, file],
    };
  }
}
