// The drop-source seam: the real V2Source, the real header JSON and the real WebCrypto decrypt,
// with only the network (fetch) stubbed.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { V2Source } from './_build/app/drop-source.mjs';

globalThis.window = { location: { hostname: 'example.test' } };

const key = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
const b64 = (bytes) => Buffer.from(bytes).toString('base64');

const encrypt = async (iv, plain) => {
  const k = await crypto.subtle.importKey('raw', key, 'AES-CBC', false, ['encrypt']);
  return new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, k, plain));
};

const ivFor = (n) => Uint8Array.from({ length: 16 }, (_, i) => n * 16 + i);

/** Builds the stubbed server for one drop: header json plus encrypted payloads by key. */
const buildDrop = async ({ manifestKey, content, files }) => {
  const enc = new TextEncoder();
  const ivs = {};
  const payloadBytes = {};
  const manifest = [];
  let n = 1;

  for (const f of files) {
    const dataKey = `wdr_dat${n}`;
    ivs[dataKey] = b64(ivFor(n));
    payloadBytes[dataKey] = await encrypt(ivFor(n), enc.encode(f.text));
    manifest.push({ key: dataKey, name: f.name, contentType: f.contentType });
    n++;
  }
  ivs[manifestKey] = b64(ivFor(n));
  payloadBytes[manifestKey] = await encrypt(ivFor(n), enc.encode(JSON.stringify(manifest)));

  const header = {
    fileMetadata: {
      ttl: -1200000,
      appData: { content: JSON.stringify({ ...content, ivs }) },
      payloads: Object.entries(payloadBytes).map(([k, v]) => ({
        key: k,
        contentType: 'application/octet-stream',
        bytesWritten: v.length,
        descriptorContent: k,
      })),
    },
  };
  return { header, payloadBytes };
};

let requests;
const serve = ({ header, payloadBytes }) => {
  requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/header')) return Response.json(header);
    const m = url.match(/\/payload\/(.+)$/);
    if (m && payloadBytes[m[1]]) return new Response(payloadBytes[m[1]]);
    return new Response('nope', { status: 404 });
  };
};

const payloadFetches = () => requests.filter((r) => r.url.includes('/payload/')).map((r) => r.url.split('/payload/')[1]);
const source = () => new V2Source('drive', 'drop', key);

beforeEach(() => {
  requests = [];
});

test('wdr_vmeta header: viewOnly, manifest hidden from the payload list, fetched first', async () => {
  serve(
    await buildDrop({
      manifestKey: 'wdr_vmeta',
      content: { v: 2, viewOnly: true },
      files: [{ name: 'a.txt', contentType: 'text/plain', text: 'hello' }],
    })
  );
  const s = source();
  const header = await s.fetchHeader();
  assert.equal(header.viewOnly, true);
  assert.equal(header.v, 2);
  assert.deepEqual(header.payloads.map((p) => p.key), ['wdr_dat1']);

  const files = await s.openDrop();
  assert.equal(payloadFetches()[0], 'wdr_vmeta');
  assert.equal(new TextDecoder().decode(files[0].bytes), 'hello');
  assert.equal(files[0].name, 'a.txt');
});

test('the wdr_vmeta key alone marks the drop view-only, even without the flag', async () => {
  serve(
    await buildDrop({
      manifestKey: 'wdr_vmeta',
      content: { v: 2 },
      files: [{ name: 'a.txt', contentType: 'text/plain', text: 'x' }],
    })
  );
  assert.equal((await source().fetchHeader()).viewOnly, true);
});

test('the flag alone marks a drop view-only', async () => {
  serve(
    await buildDrop({
      manifestKey: 'wdr_meta',
      content: { v: 2, viewOnly: true },
      files: [{ name: 'a.txt', contentType: 'text/plain', text: 'x' }],
    })
  );
  assert.equal((await source().fetchHeader()).viewOnly, true);
});

test('legacy header: not view-only, wdr_meta is the manifest and still hidden', async () => {
  serve(
    await buildDrop({
      manifestKey: 'wdr_meta',
      content: { v: 1 },
      files: [{ name: 'a.txt', contentType: 'text/plain', text: 'legacy' }],
    })
  );
  const s = source();
  const header = await s.fetchHeader();
  assert.equal(header.viewOnly, false);
  assert.deepEqual(header.payloads.map((p) => p.key), ['wdr_dat1']);

  const files = await s.openDrop();
  assert.equal(payloadFetches()[0], 'wdr_meta');
  assert.equal(new TextDecoder().decode(files[0].bytes), 'legacy');
});

test('v: 3 is exposed and openDrop makes no payload fetch at all', async () => {
  serve(
    await buildDrop({
      manifestKey: 'wdr_vmeta',
      content: { v: 3, viewOnly: true },
      files: [{ name: 'a.txt', contentType: 'text/plain', text: 'x' }],
    })
  );
  const s = source();
  assert.equal((await s.fetchHeader()).v, 3);
  assert.equal(await s.openDrop(), null);
  assert.deepEqual(payloadFetches(), []);
});

test('anonymous fetches are no-store and cookieless', async () => {
  serve(
    await buildDrop({
      manifestKey: 'wdr_vmeta',
      content: { v: 2, viewOnly: true },
      files: [{ name: 'a.txt', contentType: 'text/plain', text: 'x' }],
    })
  );
  const s = source();
  await s.fetchHeader();
  await s.openDrop();
  assert.ok(requests.length >= 3);
  for (const r of requests) {
    assert.equal(r.init.cache, 'no-store');
    assert.equal(r.init.credentials, 'omit');
  }
});
