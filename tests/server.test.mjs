import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {contentType} from '../mime.mjs';
test('regressão: logo SVG é servida como imagem, não como HTML',async()=>{
  assert.equal(contentType('dist/assets/logo.svg'),'image/svg+xml');
  assert.equal(contentType('LOGO.SVG'),'image/svg+xml');
  assert.match(await readFile(new URL('../dist/assets/logo.svg',import.meta.url),'utf8'),/<svg\s/);
});
test('servidor mantém tipos dos arquivos da aplicação',()=>{
  assert.match(contentType('app.js'),/^text\/javascript/);
  assert.match(contentType('style.css'),/^text\/css/);
  assert.match(contentType('index.html'),/^text\/html/);
});
