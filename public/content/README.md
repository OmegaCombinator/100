# Content Format

The dashboard reads `public/content/top100.json`, copied from:

```text
../acornlib-top100/projects/top100/frontend/top100.json
```

The schema is documented in:

```text
../acornlib-top100/projects/top100/frontend/README.md
```

Detail pages can be added as Markdown files under `public/content/problems/`.
Use the zero-padded theorem id as the filename, for example:

```text
public/content/problems/044.md
```

If a Markdown file exists, the detail page renders it. Otherwise the app renders
an automatic summary from `top100.json`.

Content changes are served at runtime by `server.mjs`; rebuilds are only needed
when the React app or styling changes.
