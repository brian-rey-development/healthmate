import type { APIRoute } from 'astro';
import { FEATURES, SITE } from '../data/site';
import { absoluteUrl } from '../data/url';

const buildBody = (siteUrl: string) =>
  [
    `# ${SITE.name}`,
    `> ${SITE.description}`,
    `Site: ${siteUrl}`,
    `Status: ${SITE.status}. ${SITE.disclaimer}`,
    ['## Features', '', ...FEATURES.map(({ title, body: text }) => `- ${title}. ${text}`)].join('\n'),
    ['## Links', '', `- [Source code](${SITE.repoUrl})`].join('\n'),
  ].join('\n\n');

export const GET: APIRoute = ({ site }) =>
  new Response(`${buildBody(absoluteUrl('', site))}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
