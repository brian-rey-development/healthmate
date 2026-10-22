# @healthmate/site

`site` is the public product page. It is built with Astro and Tailwind and deployed to GitHub Pages under `/healthmate/`. It imports no workspace package.

## Layout

- `src/data/site.ts` holds all copy and all links. A component never writes a product text inline.
- `src/layouts/Base.astro` holds the `<head>`, the meta tags and the JSON-LD. A page uses `Base` and adds only its sections.
- One component for each section, for example `Hero.astro` and `Features.astro`.
- A list of items, for example the features, is 1 array in `site.ts`. Each item holds its own image import, so a new item is 1 change.

## Performance

- The site ships no client JavaScript. A `<script>` or a `client:*` island needs a reason in the PR.
- An image uses `<Image>` from `astro:assets` with a `width` of 2 times its CSS width. An image shown at 128 px gets `width={256}`.
- The first image in the viewport has `loading="eager"` and `fetchpriority="high"`. Every other image is lazy.
- Fonts come from the Astro fonts API or from the latin subset files only, with a preload for the display font. The site loads no other subset.
- The total weight of the home page stays under 200 KB without images. Check it with `pnpm --filter @healthmate/site build` and the size of `dist`.

## URLs

- Build every absolute URL with 1 helper, `new URL(path, new URL(import.meta.env.BASE_URL, Astro.site))`. Never join `BASE_URL` with a string.
- `og.png` is 1200 by 630 px, and the meta tags say so.
- `public/robots.txt` names the sitemap. `src/pages/404.astro` uses `Base`.

## Access

- A decorative image has `alt=""`. An image that carries meaning has an alt text that says the meaning.
- Small text has a contrast of 4.5 to 1 on its background. With the `ink` color on the page background, use `/80` or more.
- A link or a button has a target of 24 by 24 px.
- Focus styles use `outline` only, so the outline follows the shape of the element.
- Headings go in order, `h1` once, then `h2` and `h3`. Each section has `aria-labelledby` on its heading.

## Checks

- `pnpm --filter @healthmate/site build` passes before a merge. CI runs it.
- The theme color in `Base.astro` is the page background token in `global.css`.
