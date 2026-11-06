import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiType, DotYouClient } from '../DotYouClient';
import type { TargetDrive } from '../core';

const loadProvider = async () => {
  vi.resetModules();
  return import('./WebsocketProvider');
};

// Let the connect promise executor run past its preauth `await` so the cookie path
// reaches `new WebSocket`. The bearer path has no await before construction.
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

const makeClient = (api: ApiType, headers?: Record<string, string>) => {
  const post = vi.fn().mockResolvedValue({ status: 200 });
  const createAxiosClient = vi.fn().mockReturnValue({ post });
  const client = {
    getType: () => api,
    getSharedSecret: () => new Uint8Array(16).fill(1),
    getRoot: () => 'https://example.com',
    getHeaders: () => headers ?? {},
    createAxiosClient,
  } as unknown as DotYouClient;
  return { client, post, createAxiosClient };
};

const drives: TargetDrive[] = [];

beforeEach(() => {
  captured = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WebsocketProvider route selection', () => {
  it('uses the bearer route with the "odin.bearer." subprotocol (base64url) for an App with a token, with no preauth', async () => {
    const { Subscribe } = await loadProvider();
    const { client, post } = makeClient(ApiType.App, { bx0900: 'ab+/cd==' });
    Subscribe(client, drives, () => {}).catch(() => {});
    await flush();
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('wss://example.com/api/v2/notify/ws-token-wasm');
    expect(captured[0].protocols).toEqual(['odin.notify.v1', 'odin.bearer.ab-_cd']);
    expect(post).not.toHaveBeenCalled();
  });

  it('preauths on V2, then uses the app cookie route, when the App has no bx0900 token', async () => {
    const { Subscribe } = await loadProvider();
    const { client, post, createAxiosClient } = makeClient(ApiType.App, {});
    Subscribe(client, drives, () => {}).catch(() => {});
    await flush();
    expect(createAxiosClient).toHaveBeenCalledWith({ v2: true, overrideEncryption: true });
    expect(post.mock.calls[0][0]).toBe('/notify/preauth');
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('wss://example.com/api/v2/notify/ws-cookie-app');
    expect(captured[0].protocols).toEqual(['odin.notify.v1']);
  });

  it('uses the owner cookie route for the owner console, with no bearer and no preauth', async () => {
    const { Subscribe } = await loadProvider();
    const { client, post } = makeClient(ApiType.Owner, { bx0900: 'ab+/cd==' });
    Subscribe(client, drives, () => {}).catch(() => {});
    await flush();
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('wss://example.com/api/v2/notify/ws-cookie-owner');
    expect(captured[0].protocols).toEqual(['odin.notify.v1']);
    expect(post).not.toHaveBeenCalled();
  });

  it('passes the extra constructor arguments on every route', async () => {
    const args = { headers: { something: 'for react native' } };
    const { Subscribe } = await loadProvider();
    const { client } = makeClient(ApiType.Owner);
    Subscribe(client, drives, () => {}, undefined, undefined, args).catch(() => {});
    await flush();
    expect(captured[0].args).toBe(args);
  });
});
