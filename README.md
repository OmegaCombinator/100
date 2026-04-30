# AixMath 100

Static progress site for the AixMath formalization Top 100 work.

## Content

- Dashboard data: `public/content/top100.json`
- Formalization progress: `public/content/progress.json`
- Detail pages: `public/content/problems/*.md`

`top100.json` is copied from:

```text
../acornlib-top100/projects/top100/frontend/top100.json
```

The deployed Node server serves `/content` directly from `public/content`, so
data and Markdown edits appear after a browser refresh. Add a detail page such
as `public/content/problems/044.md` to override the automatic summary for #44.
Add theorem ids to `public/content/progress.json` to turn the progress grid
green for fully formalized theorems.
Run `npm run build` only after changing frontend code.

To refresh the packaged Top 100 data from the workspace:

```bash
npm run sync:data
```

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
PORT=8100 npm run serve
```

The current deployment uses a user systemd unit equivalent to
`deploy/aixmath-100.service` and Cloudflare Tunnel ingress equivalent to
`deploy/cloudflared-ingress.yml`.
