import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiType, DotYouClient } from '../DotYouClient';
import type { TargetDrive } from '../core';

const loadProvider = async () => {
  vi.resetModules();
  return import('./WebsocketProvider');
};

// Let the connect promise executor run past its preauth `await` so the V1 path
// reaches `new WebSocket`. The V2 path has no await before construction.
const flush = () => new Promise((r) => setTimeout(r, 0));

let captured: { url: string; protocols?: string[] | string; args: unknown }[];

class FakeWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onclose: ((e: unknown) => void) | null = null;
  constructor(url: string, protocols?: string[] | string, args?: unknown) {
    captured.push({ url, protocols, args });
  }
  close() {}
  send() {}
}

const makeClient = (api: ApiType, headers?: Record<string, string>) =>
  ({
    getType: () => api,
    getSharedSecret: () => new Uint8Array(16).fill(1),
    getRoot: () => 'https://example.com',
    getHeaders: () => headers ?? {},
    createAxiosClient: () => ({ post: () => Promise.resolve() }),
  }) as unknown as DotYouClient;

const drives: TargetDrive[] = [];

beforeEach(() => {
  captured = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WebsocketProvider V1/V2 selection', () => {
  it('defaults to the V1 cookie path (no subprotocol) for App connections', async () => {
    const { Subscribe } = await loadProvider();
    Subscribe(makeClient(ApiType.App, { bx0900: 'ab+/cd==' }), drives, () => {}, undefined, undefined, undefined, undefined, false).catch(() => {});
    await flush();
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('wss://example.com/api/apps/v1/notify/ws');
    expect(captured[0].protocols).toBeUndefined();
  });

  it('uses the V2 route with the "odin.bearer." subprotocol (base64url) when useV2 is set', async () => {
    const { Subscribe } = await loadProvider();
    Subscribe(makeClient(ApiType.App, { bx0900: 'ab+/cd==' }), drives, () => {}, undefined, undefined, undefined, undefined, true).catch(() => {});
    await flush();
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('wss://example.com/api/v2/notify/ws-token-wasm');
    expect(captured[0].protocols).toEqual(['odin.notify.v1', 'odin.bearer.ab-_cd']);
  });

  it('omits the subprotocol on V2 when the App has no bx0900 token', async () => {
    const { Subscribe } = await loadProvider();
    Subscribe(makeClient(ApiType.App, {}), drives, () => {}, undefined, undefined, undefined, undefined, true).catch(() => {});
    await flush();
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('wss://example.com/api/v2/notify/ws-token-wasm');
    expect(captured[0].protocols).toBeUndefined();
  });

  it('ignores useV2 for Owner connections (stays on V1 cookie path)', async () => {
    const { Subscribe } = await loadProvider();
    Subscribe(makeClient(ApiType.Owner, { bx0900: 'ab+/cd==' }), drives, () => {}, undefined, undefined, undefined, undefined, true).catch(() => {});
    await flush();
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('wss://example.com/api/owner/v1/notify/ws');
    expect(captured[0].protocols).toBeUndefined();
  });
});
