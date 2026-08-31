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

import { base64ToBytes, decryptDropPayload } from './crypto';

export interface DropPayload {
  key: string;
  name: string;
  contentType: string;
  bytesWritten: number;
}

export interface DropIntro {
  recipientName?: string;
  conditions: string[];
  note?: string;
}

export interface DropHeader {
  ttl: number;
  payloads: DropPayload[];
  /** Viewer theme id from cleartext content; absent means mission. */
  theme?: string;
  /** Decrypted from the header's intro blob when the fragment key is present. */
  intro?: DropIntro;
}

export interface DroppedFile {
  name: string;
  contentType: string;
  bytes: Uint8Array;
}

export interface DropSource {
  readonly sender: string;
  /** null means gone: expired, burned, or never existed - the server does not say which. */
  fetchHeader(): Promise<DropHeader | null>;
  /**
   * Fetches and DECRYPTS the drop: manifest first (real names), then every payload. The first
   * payload fetch in here is what starts a burn clock. null means gone.
   */
  openDrop(): Promise<DroppedFile[] | null>;
  /**
   * Asks the server to bring the file's death forward to now, killing the LINK for every holder -
   * not just this page's copy. True only when the server confirmed. Anonymous on purpose: whoever
   * can call this already holds the content, so all they can surrender is remaining lifetime.
   */
  expireNow(): Promise<boolean>;
}

// --- real ---------------------------------------------------------------------------------------

export class V2Source implements DropSource {
  readonly sender = window.location.hostname;

  constructor(
    private readonly driveId: string,
    private readonly dropId: string,
    /** The link key from the fragment; null when the URL carried none. */
    private readonly key: Uint8Array | null
  ) {}

  /** payload key -> base64 IV, cached from the header's cleartext content. */
  private ivs: Record<string, string> = {};

  private url(tail: string) {
    return `/api/v2/drives/${this.driveId}/files/by-uid/${this.dropId}/${tail}`;
  }

  // credentials: 'omit' is load-bearing, not hygiene. A drop link is a capability URL and must
  // read the same for every holder - but if the OWNER opens their own link while logged in on
  // this host, the browser's ambient cookie authenticates the request and the server wraps the
  // response in the shared-secret {iv, data} envelope. That envelope is valid JSON, so it parsed
  // "successfully" as a header with no fileMetadata: ttl read 0 and payloads read empty, and the
  // viewer walked straight to the destruct screen. Cookieless, everyone is anonymous and the
  // response is plain.
  private fetchAnonymously(tail: string) {
    return fetch(this.url(tail), { credentials: 'omit' });
  }

  async fetchHeader(): Promise<DropHeader | null> {
    const response = await this.fetchAnonymously('header');
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

    let theme: string | undefined;
    let intro: DropIntro | undefined;
    try {
      const content = JSON.parse(header?.fileMetadata?.appData?.content ?? '{}');
      this.ivs = content.ivs ?? {};
      theme = content.theme ?? undefined;
      // The intro decrypts from the HEADER alone - deliberately, since a header read never
      // starts the burn clock, so personalizing this screen costs a prefetching scanner nothing.
      if (content.intro && this.key) {
        const plain = await decryptDropPayload(
          this.key,
          base64ToBytes(content.intro.iv),
          base64ToBytes(content.intro.data)
        );
        const parsed = JSON.parse(new TextDecoder().decode(plain));
        intro = {
          recipientName: parsed.recipientName ?? undefined,
          conditions: parsed.conditions ?? [],
          note: parsed.note ?? undefined,
        };
      }
    } catch {
      // A malformed or undecryptable intro degrades to the impersonal screen, never to an error.
    }

    return { ttl: header?.fileMetadata?.ttl ?? 0, payloads, theme, intro };
  }

  async openDrop(): Promise<DroppedFile[] | null> {
    if (!this.key) return null; // no fragment key, nothing decryptable

    const manifestBytes = await this.fetchAndDecrypt('wdr_meta');
    if (!manifestBytes) return null;

    const manifest: { key: string; name: string; contentType: string }[] = JSON.parse(
      new TextDecoder().decode(manifestBytes)
    );

    const files: DroppedFile[] = [];
    for (const entry of manifest) {
      const bytes = await this.fetchAndDecrypt(entry.key);
      if (bytes) files.push({ name: entry.name, contentType: entry.contentType, bytes });
    }
    return files.length > 0 ? files : null;
  }

  private async fetchAndDecrypt(payloadKey: string): Promise<Uint8Array | null> {
    const iv = this.ivs[payloadKey];
    if (!iv || !this.key) return null;
    const response = await this.fetchAnonymously(`payload/${payloadKey}`);
    if (!response.ok) return null;
    const cipher = new Uint8Array(await response.arrayBuffer());
    try {
      return await decryptDropPayload(this.key, base64ToBytes(iv), cipher);
    } catch (e) {
      console.warn(`[webdrop] decrypt failed for ${payloadKey}`, e);
      return null;
    }
  }

  async expireNow(): Promise<boolean> {
    try {
      const response = await fetch(this.url('expire-now'), { method: 'POST', credentials: 'omit' });
      return response.ok;
    } catch (e) {
      console.warn('[webdrop] expire-now failed', e);
      return false;
    }
  }
}

// --- demo ---------------------------------------------------------------------------------------

const DEMO_TTL_MS = 1_200_000; // the real burn window - 20 minutes, no artificial panic
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

  async fetchHeader(): Promise<DropHeader | null> {
    if (sessionStorage.getItem(DEMO_DESTRUCTED_KEY)) return null;

    // Same one-way door as the server: pending until the first payload read, absolute after.
    const resolvedAt = sessionStorage.getItem(DEMO_RESOLVED_KEY);
    const ttl = resolvedAt ? Number(resolvedAt) : -DEMO_TTL_MS;

    // ?theme=clean|choplifter previews the themes without minting a drop.
    const theme = new URLSearchParams(window.location.search).get('theme') ?? 'mission';

    return {
      ttl,
      payloads: [
        { key: 'wdr_data', name: 'mission-briefing.txt', contentType: 'text/plain', bytesWritten: 292 },
        { key: 'wdr_img1', name: 'clearance-badge.svg', contentType: 'image/svg+xml', bytesWritten: 428 },
      ],
      theme,
      intro: {
        recipientName: 'Thomas Kragh-Muller',
        conditions: ['recipient_only', 'no_retention'],
      },
    };
  }

  async openDrop(): Promise<DroppedFile[] | null> {
    if (sessionStorage.getItem(DEMO_DESTRUCTED_KEY)) return null;

    if (!sessionStorage.getItem(DEMO_RESOLVED_KEY)) {
      sessionStorage.setItem(DEMO_RESOLVED_KEY, String(Date.now() + DEMO_TTL_MS));
    }

    await new Promise((resolve) => setTimeout(resolve, 350)); // let the transmission feel real
    return [
      {
        name: 'mission-briefing.txt',
        contentType: 'text/plain',
        bytes: new Uint8Array(await demoBriefing().arrayBuffer()),
      },
      {
        name: 'clearance-badge.svg',
        contentType: 'image/svg+xml',
        bytes: new Uint8Array(await demoBadge().arrayBuffer()),
      },
    ];
  }

  destruct() {
    sessionStorage.setItem(DEMO_DESTRUCTED_KEY, '1');
    sessionStorage.removeItem(DEMO_RESOLVED_KEY);
  }

  async expireNow(): Promise<boolean> {
    this.destruct();
    return true;
  }
}
