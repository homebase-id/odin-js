// Cross-repo contract: fixtures are the real chat-kmp sender output (buildWebDrop), written by
// homebase-core WebDropGoldenFixtureTest. Fed byte-for-byte; only fetch is stubbed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDomStub, walk } from './preview-dom-stub.mjs';

installDomStub();
globalThis.window = { location: { hostname: 'example.test' } };
const { V2Source } = await import('./_build/app/drop-source.mjs');
const { openScreenHtml } = await import('./_build/app/screens/open.mjs');
const { renderPreviewList } = await import('./_build/app/preview/render.mjs');

const load = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), 'utf8'));
const keyBytes = (s) => new Uint8Array(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));

let requests;
const serve = (fx, content = fx.content) => {
  requests = [];
  const header = {
    fileMetadata: {
      ttl: -1200000,
      appData: { content },
      payloads: Object.keys(fx.payloads).map((k) => ({
        key: k, contentType: 'application/octet-stream', bytesWritten: 1, descriptorContent: k,
      })),
    },
  };
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/header')) return Response.json(header);
    const m = url.match(/\/payload\/(.+)$/);
    if (m && fx.payloads[m[1]]) return new Response(Buffer.from(fx.payloads[m[1]], 'base64'));
    return new Response('nope', { status: 404 });
  };
  return new V2Source('drive', 'drop', keyBytes(fx.keyB64Url));
};
const fetched = () => requests.filter((r) => r.url.includes('/payload/')).map((r) => r.url.split('/payload/')[1]);
const withContent = (fx, patch) => JSON.stringify({ ...JSON.parse(fx.content), ...patch });

test('Kotlin view-only drop: detected, decrypts, no download action anywhere', async () => {
  const fx = load('kotlin-drop-viewonly');
  assert.equal(JSON.parse(fx.content).viewOnly, true);
  const s = serve(fx);
  const header = await s.fetchHeader();
  assert.equal(header.viewOnly, true);
  assert.equal(header.v, 2);
  assert.deepEqual(header.payloads.map((p) => p.key), ['wdr_dat1']);

  const files = await s.openDrop();
  assert.equal(fetched()[0], 'wdr_vmeta');
  assert.equal(new TextDecoder().decode(files[0].bytes), 'hello golden');

  const withUrls = files.map((f) => ({ ...f, url: `blob:${f.name}` }));
  assert.equal(/\bdownload\b/i.test(openScreenHtml(withUrls, header.viewOnly, 0)), false);
  for (const el of walk(renderPreviewList(withUrls))) assert.equal(el.hasAttribute('download'), false);
});

test('Kotlin normal drop: not view-only, wdr_meta, download action present', async () => {
  const fx = load('kotlin-drop-normal');
  assert.equal('viewOnly' in JSON.parse(fx.content), false);
  const s = serve(fx);
  const header = await s.fetchHeader();
  assert.equal(header.viewOnly, false);
  assert.equal(header.v, 1);
  const files = await s.openDrop();
  assert.equal(fetched()[0], 'wdr_meta');
  assert.equal(new TextDecoder().decode(files[0].bytes), 'hello golden');
  const withUrls = files.map((f) => ({ ...f, url: `blob:${f.name}` }));
  assert.match(openScreenHtml(withUrls, header.viewOnly, 0), /download="a.txt"/);
});

test('older-contract degradations of the Kotlin view-only content', async () => {
  const fx = load('kotlin-drop-viewonly');
  // Flag absent, v2, wdr_vmeta: the manifest key alone still means view-only.
  let s = serve(fx, withContent(fx, { viewOnly: undefined }));
  assert.equal((await s.fetchHeader()).viewOnly, true);
  // Unknown flag value is not `true`; the key still decides.
  s = serve(fx, withContent(fx, { viewOnly: 'yes' }));
  assert.equal((await s.fetchHeader()).viewOnly, true);
  // Newer version: shown but never opened, no payload fetch.
  s = serve(fx, withContent(fx, { v: 3 }));
  assert.equal((await s.fetchHeader()).v, 3);
  assert.equal(await s.openDrop(), null);
  assert.deepEqual(fetched(), []);
});

test('Kotlin normal content with an unknown flag value stays a normal drop', async () => {
  const fx = load('kotlin-drop-normal');
  const s = serve(fx, withContent(fx, { viewOnly: 'yes' }));
  assert.equal((await s.fetchHeader()).viewOnly, false);
});

test('old viewer behaviour on a Kotlin view-only drop: wdr_meta has no IV, so no payload is read', () => {
  const fx = load('kotlin-drop-viewonly');
  const ivs = JSON.parse(fx.content).ivs;
  assert.equal('wdr_meta' in ivs, false);
  assert.ok('wdr_vmeta' in ivs);
});
