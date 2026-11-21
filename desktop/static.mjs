import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { contentType } from '../mime.mjs';

export const walletScheme = 'castor-wallet';
export const walletHost = 'app';
export const walletUrl = `${walletScheme}://${walletHost}/index.html`;

const assetExtensions = new Set(['.html', '.css', '.js', '.svg', '.png']);
const policy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

export async function serveWallet(request, root) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });

  try {
    const url = new URL(request.url);
    if (url.protocol !== `${walletScheme}:` || url.host !== walletHost) {
      return new Response(null, { status: 404 });
    }
    const pathname = decodeURIComponent(url.pathname);
    if (!/^\/[a-z0-9._/-]+$/i.test(pathname)) {
      return new Response(null, { status: 404 });
    }
    const file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + sep) || !assetExtensions.has(extname(file))) {
      return new Response(null, { status: 404 });
    }
    return new Response(await readFile(file), {
      headers: {
        'Content-Type': contentType(file),
        'Content-Security-Policy': policy,
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
