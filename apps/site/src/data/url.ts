export const absoluteUrl = (path: string, site: URL | undefined) => {
  if (!site) throw new Error('Astro `site` is not set in astro.config.mjs');
  return new URL(path, new URL(import.meta.env.BASE_URL, site)).href;
};
