import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiType, DotYouClient } from '../DotYouClient';
import type { TargetDrive } from '../core';

// WebsocketProvider keeps module-level singleton state (the live socket, the subscriber
// list). Re-import it fresh per test so one connection attempt can't leak into the next.
const loadProvider = async () => {
  vi.resetModules();
  return import('./WebsocketProvider');
};

// Capture every `new WebSocket(url, protocols, args)` the provider makes, without opening a
// real socket. Construction is synchronous inside ConnectSocket, so the capture is populated
// by the time Subscribe() returns.
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
  }) as unknown as DotYouClient;

const drives: TargetDrive[] = [];

beforeEach(() => {
  captured = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WebsocketProvider App subprotocol auth', () => {
  it('sends the app token as an "odin.bearer." subprotocol (base64url) for App connections', async () => {
    const { Subscribe } = await loadProvider();

    // A real bx0900 is standard base64; the "+/=" chars must become URL-safe "-_<no pad>"
    // because Sec-WebSocket-Protocol values are RFC 7230 tokens.
    Subscribe(makeClient(ApiType.App, { bx0900: 'ab+/cd==' }), drives, () => {}).catch(() => {});

    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('wss://example.com/api/apps/v1/notify/ws');
    expect(captured[0].protocols).toEqual(['odin.notify.v1', 'odin.bearer.ab-_cd']);
  });

  it('omits the subprotocol when the App has no bx0900 token', async () => {
    const { Subscribe } = await loadProvider();

    Subscribe(makeClient(ApiType.App, {}), drives, () => {}).catch(() => {});

    expect(captured).toHaveLength(1);
    expect(captured[0].protocols).toBeUndefined();
  });

  it('uses the same-site cookie path (no subprotocol) for Owner connections', async () => {
    const { Subscribe } = await loadProvider();

    Subscribe(makeClient(ApiType.Owner, { bx0900: 'ab+/cd==' }), drives, () => {}).catch(() => {});

    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('wss://example.com/api/owner/v1/notify/ws');
    expect(captured[0].protocols).toBeUndefined();
  });
});
