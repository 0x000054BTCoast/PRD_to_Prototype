# PRD2Prototype (Local Desktop MVP)

PRD2Prototype converts product requirement text (Markdown or plain text) into a structured document model and then generates a visual prototype layout you can inspect and export.

This repository is intended as a **handoff-ready local MVP**:
- ingest PRD text (upload, paste, bundled example),
- parse and normalize content into pages/modules/components/interactions,
- render prototype pages in HTML or SVG preview mode,
- export prototype artifacts to local files.

## Local-only security assumptions

This app is designed for local use and does **not** require a backend service.

- PRD input is processed in the renderer process with local parsing modules.
- The UI explicitly communicates local-only processing.
- No authentication or multi-tenant data model is implemented.
- No automatic cloud upload is built into this MVP.
- Optional DeepSeek parsing can be enabled via API key to improve PRD understanding quality.

> If you enable DeepSeek parsing, PRD prompts are sent to DeepSeek API. Leave it disabled for local rule-based parsing only.

## Stack

- **Desktop shell:** Electron
- **Frontend:** Vue 3 + Vue Router + Element Plus
- **Language/tooling:** TypeScript + Vite + vue-tsc
- **State:** simple reactive store (`src/stores/appStore.ts`)
- **Pipeline modules:** parser, classifiers, layout engine, renderer/export utilities

## Install

```bash
cd prd2prototype
npm install
```

## Run

### Standard desktop development run

```bash
npm run dev
```

This starts the Vite + Electron development workflow configured by `vite-plugin-electron`.

### Web-only run (useful in constrained environments)

```bash
npm run dev:web
```

> Note: depending on environment packages, Electron binary launch can fail even when web mode works (for example missing native Linux libs in minimal containers).

## Build

```bash
npm run build
```

This runs:
1. type-check (`vue-tsc --noEmit`)
2. frontend production build (`vite build`)
3. electron main/preload build via the configured Vite Electron plugin

## Optional DeepSeek parser


### 新手快速配置（无需改 .env）

1. 打开 **Home** 页面。
2. 在 **DeepSeek Parser 设置（推荐）** 区域打开开关。
3. 粘贴你的 `DeepSeek API Key`（`sk-...`）并保存。
4. 重新点击 Parse/Regenerate 即可走 DeepSeek 解析。

> API Key 会保存到当前浏览器的 LocalStorage，仅本机可见。

The parser pipeline now supports a preferred DeepSeek parsing path (`runParsingPipelinePreferDeepseek`) that asks DeepSeek to convert PRD text into structured JSON, then normalizes it for rendering.

- Default endpoint: `https://api.deepseek.com`
- Default model: `deepseek-chat`
- Configure API key from Home page settings (or `VITE_DEEPSEEK_API_KEY` as fallback).
The parser pipeline now supports a preferred DeepSeek parsing path (`runParsingPipelinePreferDeepseek`) that asks DeepSeek to convert PRD text into structured JSON, then normalizes it for rendering.

- Default endpoint: `https://api.deepseek.com`
- Default model: `deepseek-chat`
- Configure `VITE_DEEPSEEK_API_KEY` to enable API calls.
- Set `VITE_ENABLE_DEEPSEEK_PARSER=false` to force rule-based parsing only.
- DeepSeek parsing is non-blocking; failures fall back to the deterministic parser pipeline.

## Export capabilities

From the Prototype page, the Export dialog can generate local downloads based on:
- **format** (HTML or SVG output paths handled by renderer modules),
- **scope** (selected page or all pages depending on dialog choice),
- **label/style toggles** passed into the export renderer.

Exports are generated fully on the client side and downloaded through browser/Electron-compatible download logic.

## Example flow (end-to-end)

1. Start the app (`npm run dev` or `npm run dev:web`).
2. Open **Home** → **Example** tab → click **Load example file**.
3. Go to **Parser** and verify parsed structure/JSON appears.
4. Go to **Prototype** and verify pages/canvas render.
5. Click **Export** and confirm export dialog opens, then export locally.

Bundled sample PRD: `public/example-prd.md`.

## Project structure summary

```text
prd2prototype/
├── electron/                  # Electron main & preload
├── public/
│   └── example-prd.md         # Bundled quick-start sample input
├── src/
│   ├── ai/                    # DeepSeek/Ollama clients + AI parsing/enhancement hooks
│   ├── parser/                # Preprocess + parsing strategies + normalization pipeline
│   ├── classifier/            # Rule-based type classifiers
│   ├── layout/                # Layout/model generation engine
│   ├── renderer/              # HTML/SVG export rendering + download helpers
│   ├── components/            # Reusable Vue components (home/parser/prototype/layout)
│   ├── pages/                 # Route-level pages
│   ├── router/                # App routes
│   ├── stores/                # Shared reactive app state
│   ├── constants/             # Dimension and keyword constants
│   ├── types/                 # Domain and pipeline TypeScript types
│   └── utils/                 # Generic utilities
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Verification checklist

- `npm run build` passes type-check + build.
- Example PRD can be loaded from the Home page.
- Parser and Prototype pages render from the same source state.
- Export dialog opens and local export works.
