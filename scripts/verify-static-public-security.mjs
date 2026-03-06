import { readFileSync } from 'node:fs';

const staticRoutes = ['/', '/privacy', '/terms'];
const staticHtmlFiles = ['dist/index.html', 'dist/privacy/index.html', 'dist/terms/index.html'];

function read(path) {
  return readFileSync(path, 'utf-8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getHeadersBlock(content, route) {
  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`(^|\\n)${escapedRoute}\\n((?:\\s{2}.+\\n?)*)`, 'm'));
  return match?.[0] ?? '';
}

function countInlineScripts(html) {
  const scriptTags = [...html.matchAll(/<script\b([^>]*)>/g)];
  return scriptTags.filter((match) => !/\bsrc=/.test(match[1])).length;
}

const routes = JSON.parse(read('dist/_routes.json'));
const headersFile = read('dist/_headers');

for (const route of staticRoutes) {
  assert(routes.exclude.includes(route), `Expected dist/_routes.json to exclude ${route}`);

  const headersBlock = getHeadersBlock(headersFile, route);
  assert(headersBlock, `Expected dist/_headers to contain a block for ${route}`);
  assert(
    headersBlock.includes("Content-Security-Policy: default-src 'self'; script-src 'self';"),
    `Expected static CSP for ${route}`
  );
}

for (const htmlPath of staticHtmlFiles) {
  const html = read(htmlPath);
  assert(countInlineScripts(html) === 0, `Expected ${htmlPath} to contain zero inline scripts`);
}

console.log('Static public security artifacts verified.');
