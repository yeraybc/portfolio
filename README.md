# Yeray Benito: portfolio

Personal portfolio of Yeray Benito, Data Scientist in Madrid. It is built as an experiment tracker: every project is a **run** with its config, its metrics against a baseline, the decisions behind it and what did not work.

## What is in it

| Page | What it shows |
|---|---|
| `/` | A small MLP training **live in your browser** (Web Worker, no libraries) on 2,000 Madrid homes against an OLS baseline, plus the run summary and featured runs |
| `/runs` | All runs, filterable by status and tool |
| `/runs/[slug]` | One run: overview, config (YAML), metrics, decisions, artifacts, notes |
| `/compare` | Two runs side by side, shareable with `?a=…&b=…` |
| `/deployments` | Professional experience |
| `/model-card` | About me, written as a model card |
| `/cv` | One printable A4 page |

The whole site is available in English (`/`) and Spanish (`/es`). A focus lens (`?lens=ds|quant|ai|de`) reorders runs and highlights the relevant stack, and ⌘K / Ctrl K opens a command palette.

## Stack

Astro 5 (static output) with two React islands (compare, command palette). Content lives in typed YAML collections validated with zod (`src/content`), so every page, the compare view and the CV read from the same source. Charts are plain SVG/CSS; the live run is a ~150-line TypeScript MLP (`src/lib/mlp.ts`).

## Development

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # type check + static build into dist/
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright, builds must exist)
```

Regenerating assets:

```bash
node scripts/build-live-run-data.ts ../MadridDataHouse/data/raw/Data_Housing_Madrid.csv   # live-run dataset
node scripts/make-og.mjs                                                                    # social preview image
```

Set `SITE_URL` at build time once a custom domain exists (defaults to `https://yeraybenito.vercel.app`).

## Data

The live-run sample comes from the public [MadridDataHouse](https://github.com/yeraybc/MadridDataHouse) repository. The neighbour-price feature uses training homes only, so validation never leaks into it.
