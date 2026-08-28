/**
 * Data layer for the viewer. Two sources with one shape:
 *
 * - V2Source speaks to the real anonymous V2 endpoints
 *   (`/api/v2/drives/{driveId}/files/by-uid/{uid}/...`) with plain fetch - they are token-free and
 *   not shared-secret wrapped, so no DotYouClient and no js-lib are needed.
 * - DemoSource mocks the same shapes so the whole flow can be felt with no server, no drive and no
 *   writer. `/d/demo` uses it.
 *
 * Decryption is deliberately absent. When it lands, it lands HERE - the fragment key decrypts
 * wdr_meta/wdr_data after fetch - and the screens do not change.
 *
 * Ttl semantics mirror the platform (see odin-core docs/web-drop-plan.md): 0 never expires, > 0 is
 * an absolute unix-ms deadline, < 0 is pending - the clock starts on the first payload read, which
 * is why the intro screen only ever touches the header.
 */

export interface DropPayload {
  key: string;
  name: string;
  contentType: string;
  bytesWritten: number;
}

export interface DropHeader {
  ttl: number;
  payloads: DropPayload[];
}

export interface DropSource {
  readonly sender: string;
  /** null means gone: expired, burned, or never existed - the server does not say which. */
  fetchHeader(): Promise<DropHeader | null>;
  fetchPayload(key: string): Promise<Blob | null>;
}

// --- real ---------------------------------------------------------------------------------------

export class V2Source implements DropSource {
  readonly sender = window.location.hostname;

  constructor(
    private readonly driveId: string,
    private readonly dropId: string
  ) {}

  private url(tail: string) {
    return `/api/v2/drives/${this.driveId}/files/by-uid/${this.dropId}/${tail}`;
  }

  async fetchHeader(): Promise<DropHeader | null> {
    const response = await fetch(this.url('header'));
    if (!response.ok) return null;

    const header = await response.json();
    const payloads = (header?.fileMetadata?.payloads ?? []).map(
      (p: { key: string; descriptorContent?: string; contentType: string; bytesWritten: number }) => ({
        key: p.key,
        name: p.descriptorContent || p.key,
        contentType: p.contentType,
        bytesWritten: p.bytesWritten,
      })
    );

    return { ttl: header?.fileMetadata?.ttl ?? 0, payloads };
  }

  async fetchPayload(key: string): Promise<Blob | null> {
    const response = await fetch(this.url(`payload/${key}`));
    if (!response.ok) return null;
    return await response.blob();
  }
}

// --- demo ---------------------------------------------------------------------------------------

const DEMO_TTL_MS = 90_000; // short enough that the destruct is actually watchable
const DEMO_DESTRUCTED_KEY = 'webdrop-demo-destructed';
const DEMO_RESOLVED_KEY = 'webdrop-demo-resolved-at';

const demoBriefing = () =>
  new Blob(
    [
      [
        'MISSION BRIEFING - EYES ONLY',
        '',
        'Your credit card number for the Hotel Excelsior, Roma:',
        '',
        '  4485 1234 5678 9010   exp 08/29   cvc 123',
        '',
        'This document self-destructs with the drop that carried it.',
        'Do not forward. Do not print. Trust no one.',
      ].join('\n'),
    ],
    { type: 'text/plain' }
  );

const demoBadge = () =>
  new Blob(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
  <rect width="480" height="270" fill="#0a0a0a"/>
  <rect x="8" y="8" width="464" height="254" fill="none" stroke="#e02020" stroke-width="2"/>
  <text x="240" y="120" fill="#e02020" font-family="monospace" font-size="34" text-anchor="middle">TOP SECRET</text>
  <text x="240" y="165" fill="#8a8a8a" font-family="monospace" font-size="16" text-anchor="middle">delivered by WebDrop</text>
</svg>`,
    ],
    { type: 'image/svg+xml' }
  );

export class DemoSource implements DropSource {
  readonly sender = 'biggus.dickus';

  private readonly blobs: Record<string, () => Blob> = {
    wdr_data: demoBriefing,
    wdr_img1: demoBadge,
  };

  async fetchHeader(): Promise<DropHeader | null> {
    if (sessionStorage.getItem(DEMO_DESTRUCTED_KEY)) return null;

    // Same one-way door as the server: pending until the first payload read, absolute after.
    const resolvedAt = sessionStorage.getItem(DEMO_RESOLVED_KEY);
    const ttl = resolvedAt ? Number(resolvedAt) : -DEMO_TTL_MS;

    return {
      ttl,
      payloads: [
        { key: 'wdr_data', name: 'mission-briefing.txt', contentType: 'text/plain', bytesWritten: 292 },
        { key: 'wdr_img1', name: 'clearance-badge.svg', contentType: 'image/svg+xml', bytesWritten: 428 },
      ],
    };
  }

  async fetchPayload(key: string): Promise<Blob | null> {
    if (sessionStorage.getItem(DEMO_DESTRUCTED_KEY)) return null;

    if (!sessionStorage.getItem(DEMO_RESOLVED_KEY)) {
      sessionStorage.setItem(DEMO_RESOLVED_KEY, String(Date.now() + DEMO_TTL_MS));
    }

    await new Promise((resolve) => setTimeout(resolve, 350)); // let the transmission feel real
    return this.blobs[key]?.() ?? null;
  }

  destruct() {
    sessionStorage.setItem(DEMO_DESTRUCTED_KEY, '1');
    sessionStorage.removeItem(DEMO_RESOLVED_KEY);
  }
}
