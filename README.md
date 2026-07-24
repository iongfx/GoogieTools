# Googie Tools

Simple tools that make life easier.

**Googie Tools 1.0** is a Next.js utility platform with five free, browser-based launch tools:

1. QR Code Generator  
2. Password Generator  
3. Unit Converter  
4. Batch Image Compressor  
5. Colour Screen & Pixel Tester  

Invoice Generator and Mortgage Calculator are listed as Coming soon and are not part of this launch.

Production site: [https://googietools.com](https://googietools.com)

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- ESLint
- Vitest
- `qrcode` (browser-side QR generation)
- `jszip` / `jspdf` (batch image ZIP + colour cycle PDF)

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
copy .env.example .env.local
```

3. For **local development**, set in `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production host environment

On your host (for example Vercel → Project → Settings → Environment Variables), set:

```bash
NEXT_PUBLIC_SITE_URL=https://googietools.com
```

If unset, the app falls back to `https://googietools.com`. Only public values should use the `NEXT_PUBLIC_` prefix. Do not commit `.env.local` or other secret files.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start local development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Check code with ESLint |
| `npm test` | Run automated unit / release tests |
| `npm run check:links` | Validate routes, tool order, and sitemap hygiene |
| `npm run check:release` | Links + tests + lint + production build |

## Project structure

```
src/
  app/                      # Pages and routes (App Router)
  components/
    brand/                  # Wordmark, sparkle accents
    layout/                 # Header, Footer, Container
    tools/                  # Shared tool UI (cards, headers, trust notes)
    qr/                     # QR Code Generator
    password/               # Password Generator
    unit-converter/         # Unit Converter
    image-compressor/       # Batch Image Compressor
    colour-screen/          # Colour Screen & Pixel Tester
    ui/                     # Reusable UI pieces
  config/
    brand.ts                # Brand name, site URL, default SEO copy
    tools.ts                # Central tool directory
  lib/                      # SEO, schema, converters, release checks
  types/                    # Shared TypeScript types
public/                     # Static files (favicon, brand assets)
```

## Main routes

| Route | Page |
| --- | --- |
| `/` | Homepage |
| `/tools/qr-code-generator` | Free QR Code Generator |
| `/tools/password-generator` | Free Password Generator |
| `/tools/unit-converter` | Free Unit Converter |
| `/tools/batch-image-compressor` | Free Batch Image Compressor |
| `/tools/colour-screen-pixel-tester` | Free Colour Screen & Pixel Tester |
| `/about` | About |
| `/faq` | FAQ |
| `/contact` | Contact |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Service |

Legacy redirects also point `/qr`, `/qr-code-generator`, and `/generator` to the QR tool.

## Adding a new tool later

1. Add an entry in `src/config/tools.ts` (name, slug, description, status, href).
2. Create a page at `src/app/tools/<slug>/page.tsx`.
3. Reuse `ToolPageHeader`, `TrustNote`, and other shared components.
4. Add the route to `SITEMAP_ROUTES` and release checks when the tool is available.
5. Set `status: "available"` when ready (homepage cards update from the config).

## Sharing or exporting this project

When you zip or share the project, **do not include**:

- `node_modules`
- `.next`
- `.env` / `.env.local` / `.env.*.local` (or any real secrets)
- local log files (`*.log`)
- generated build output (`dist`, `out`, `coverage`)
- `.vercel`
- OS metadata such as `.DS_Store`

Recipients can restore a clean setup with:

```bash
npm install
copy .env.example .env.local
npm run dev
```

## Before launch

- Confirm `NEXT_PUBLIC_SITE_URL=https://googietools.com` on the host
- Run `npm run check:release`
- Confirm AdSense / ads only after privacy copy and a real `ads.txt` publisher line are ready
- Review Privacy Policy and Terms of Service with a professional if needed
