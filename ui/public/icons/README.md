# App Icons

Place the following files here before deploying to enable PWA installation:

| File | Size | Source |
|---|---|---|
| `icon-192.png` | 192×192 px | Export from AFH square logo (see below) |
| `icon-512.png` | 512×512 px | Export from AFH square logo (see below) |

These are referenced by `/public/manifest.json` for PWA installation and the
Apple Touch icon meta tag in `index.html`.

## AFH Logo sources (requires Google account with Drive access)

- **Square logo (SVG):** https://drive.google.com/file/d/107jfd0drhGsGOp9gJ3YrqxyhmF_UBg0l/view?usp=drive_link
- **Round logo (SVG):** https://drive.google.com/file/d/1QOKHQtPUuswse3naAOJ9VP-6FT6IzPfH/view?usp=drive_link
- **Original logo:** https://drive.google.com/file/d/0B06t_PgfNM6HZ0YtUkd0cTFLVTA/view?usp=drive_link

## How to generate the PNG icons

1. Download the square SVG from the Drive link above
2. Save it to `ui/public/icons/afh-logo.svg`
3. Run one of the following to export PNGs:

**Using Inkscape (free):**
```sh
inkscape afh-logo.svg -w 192 -h 192 -o icon-192.png
inkscape afh-logo.svg -w 512 -h 512 -o icon-512.png
```

**Using ImageMagick:**
```sh
convert -background none afh-logo.svg -resize 192x192 icon-192.png
convert -background none afh-logo.svg -resize 512x512 icon-512.png
```

**Using an online tool:** https://www.pwabuilder.com/imageGenerator

## Logo usage in the app

Once the SVG is available at `ui/public/icons/afh-logo.svg`, update:
- `ui/src/pages/LandingPage.tsx` — replace the placeholder `<PawPrint>` icon with `<img src="/icons/afh-logo.svg" />`
- `ui/public/manifest.json` — icons array already points to icon-192.png and icon-512.png
- `functions/src/email/templates.ts` — update the `LOGO_URL` constant at the top of the file
