# meowurl

![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-9CA3AF?logo=typescript&logoColor=white&labelColor=3178C6)
![Svelte](https://img.shields.io/badge/Svelte-5.x-9CA3AF?logo=svelte&logoColor=white&labelColor=FF3E00)
![VSCode](https://img.shields.io/badge/VS_Code-1.85+-9CA3AF?logo=visualstudiocode&logoColor=white&labelColor=007ACC)

A VS Code extension for testing OpenAPI/Swagger endpoints directly in your editor.

## Features

- Auto-discovers `openapi.json`, `swagger.json`, `.yaml`, and `.yml` files in the workspace
- Sidebar endpoint tree for quick navigation
- Request panel with query params, headers, and body editing
- Auth presets (Bearer token, API key) stored securely in VS Code's secret storage
- Copy requests as `curl`, `fetch`, or `axios` snippets

## Running

Install dependencies and build:
```bash
npm install
npm run build:ext
npm run build:webview
```

Then press `F5` in VS Code to launch the extension in a new Extension Development Host window.

## License

MIT
