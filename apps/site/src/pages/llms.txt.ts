import type { APIRoute } from 'astro';
import { FEATURES, SITE } from '../data/site';

const body = [
  `# ${SITE.name}`,
  `> ${SITE.description}`,
  `Status: ${SITE.status}. ${SITE.disclaimer}`,
  ['## Features', '', ...FEATURES.map(({ title, body: text }) => `- ${title}. ${text}`)].join('\n'),
  ['## Links', '', `- [Source code](${SITE.repoUrl})`].join('\n'),
].join('\n\n');

export const GET: APIRoute = () =>
  new Response(`${body}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
