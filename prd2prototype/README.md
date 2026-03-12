# PRD2Prototype Scaffold

This repository contains the initial desktop scaffold for **PRD2Prototype** built with:

- Electron
- Vue 3
- TypeScript
- Vite
- Element Plus
- Vue Router

## Project Structure

```text
prd2prototype/
├── electron/
│   ├── main.ts
│   └── preload.ts
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/index.ts
│   ├── pages/
│   │   ├── HomePage.vue
│   │   ├── ParserPage.vue
│   │   └── PrototypePage.vue
│   ├── components/
│   │   └── layout/
│   │       ├── AppShell.vue
│   │       └── AppHeader.vue
│   ├── styles/global.css
│   └── stores/appStore.ts
├── public/example-prd.md
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Install

```bash
cd prd2prototype
npm install
```

## Run in development (Electron + Vite)

```bash
npm run dev
```

## Run web-only preview mode

```bash
npm run dev:web
```

## Build

```bash
npm run build
```
