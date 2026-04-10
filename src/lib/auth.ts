import * as vscode from "vscode";
import type { AuthPreset } from "./types";

const INDEX_KEY = "meowurl.authPresets.index";

/**
 * Manages named auth presets stored in VS Code's SecretStorage.
 * The index (list of IDs + metadata) lives in SecretStorage alongside each preset value.
 */
export class AuthPresetManager {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getAll(): Promise<AuthPreset[]> {
    const raw = await this.secrets.get(INDEX_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as AuthPreset[];
    } catch {
      return [];
    }
  }

  async save(preset: Omit<AuthPreset, "id">): Promise<AuthPreset> {
    const all = await this.getAll();
    const id = `preset_${Date.now()}`;
    const full: AuthPreset = { ...preset, id };
    all.push(full);
    await this.secrets.store(INDEX_KEY, JSON.stringify(all));
    return full;
  }

  async delete(id: string): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter((p) => p.id !== id);
    await this.secrets.store(INDEX_KEY, JSON.stringify(filtered));
  }

  /** Converts a preset into the HTTP Authorization header entry. */
  toHeader(preset: AuthPreset): [string, string] {
    if (preset.type === "bearer") {
      return ["Authorization", `Bearer ${preset.value}`];
    }
    return [preset.headerName ?? "X-API-Key", preset.value];
  }
}
