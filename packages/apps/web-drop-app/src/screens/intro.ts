import type { DropHeader, DropSource } from '../drop-source';

const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;

/**
 * The consent screen. Only the header has been fetched to get here - a header read does not start
 * the TTL clock, so a prefetching mail scanner landing on this page costs the drop nothing.
 */
const CONDITION_LINES: Record<string, string> = {
  recipient_only: 'This drop is for the named recipient only.',
  no_retention: 'I will destroy the contents after use and keep no copy on file.',
  personal_data: 'It contains personal data, which I will handle accordingly.',
};

export function renderIntro(root: HTMLElement, source: DropSource, header: DropHeader, onOpen: () => void) {
  const count = header.payloads.length;
  const totalBytes = header.payloads.reduce((sum, p) => sum + p.bytesWritten, 0);
  const isChoplifter = document.body.classList.contains('theme-choplifter');

  // ttl 0 means the writer set no expiry, but nothing on a WebDrop drive is forever - the
  // server-side sweep reaps everything at 30 days regardless. Never promise permanence.
  const destructLine =
    header.ttl < 0
      ? 'It will self-destruct when you open it.'
      : header.ttl > 0
        ? 'It is already counting down.'
        : 'It expires within 30 days.';

  const recipientLine = header.intro?.recipientName
    ? `<p class="recipient-line">For <span class="sender">${escapeHtml(header.intro.recipientName)}</span></p>`
    : '';

  const conditionLines = (header.intro?.conditions ?? [])
    .map((id) => CONDITION_LINES[id])
    .filter(Boolean);
  const termsBlock = conditionLines.length
    ? `<ul class="terms">${conditionLines.map((line) => `<li>${line}</li>`).join('')}</ul>`
    : '';

  root.innerHTML = `
    <main class="screen">
      ${isChoplifter ? choplifterScene() : ''}
      <header class="masthead">
        <img class="logo" src="./odin-logo.svg" alt="Homebase" />
        <h1 class="wordmark">WEB<span>DROP</span></h1>
      </header>

      <p class="transmission typewriter">
        <span class="sender">${source.sender}</span> has sent you a WebDrop. ${destructLine}
      </p>
      ${recipientLine}
      ${termsBlock}

      <p class="manifest">
        ${count} file${count === 1 ? '' : 's'} &middot; ${formatBytes(totalBytes)} &middot; encrypted in transit
      </p>

      <label class="consent">
        <input type="checkbox" id="consent" />
        <span>
          ${header.intro?.recipientName ? `I am ${escapeHtml(header.intro.recipientName)}. ` : 'This drop is for me alone. '}I
          agree to respect the confidentiality and privacy of
          <span class="sender">${source.sender}</span>${conditionLines.length ? ' and to the terms above' : ''},
          and I will not share its contents.
        </span>
      </label>

      <button id="open" class="open-button" disabled>OPEN DROP</button>

      <footer class="fineprint">
        delivered over Homebase &middot; no account required<br />
        <a class="homebase-cta" href="https://homebase.id" target="_blank" rel="noopener">This is cool - I want a Homebase account too</a>
      </footer>
    </main>
  `;

  const consent = root.querySelector<HTMLInputElement>('#consent')!;
  const open = root.querySelector<HTMLButtonElement>('#open')!;

  consent.addEventListener('change', () => (open.disabled = !consent.checked));

  open.addEventListener('click', () => {
    open.disabled = true;
    open.textContent = 'RECEIVING…';
    onOpen();
  });
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The Choplifter marquee: a C64 chopper flies in over the dunes, lands, drops the crate - the
 * crate IS the drop - and departs. Pure CSS/SVG, runs once, and never gates access: the consent
 * card is in the DOM from the first paint, and prefers-reduced-motion shows the chopper already
 * landed with the crate delivered.
 */
const choplifterScene = (): string => `
  <div class="c64-scene" aria-hidden="true">
    <div class="cl-stars"></div>
    <div class="cl-moon"></div>
    <div class="cl-bush cl-bush-1"></div>
    <div class="cl-bush cl-bush-2"></div>
    <div class="cl-bush cl-bush-3"></div>
    <div class="cl-ground"></div>
    <div class="cl-lawn"></div>
    <div class="cl-barracks">
      <div class="cl-roof"></div>
      <div class="cl-window"></div>
      <div class="cl-window"></div>
      <div class="cl-door"></div>
      <div class="cl-window"></div>
    </div>
    <div class="cl-flagpole"><div class="cl-flag"><span>H</span></div></div>
    <div class="c64-chopper">
      <svg viewBox="0 0 72 32" shape-rendering="crispEdges">
        <rect x="8" y="2" width="4" height="2" fill="var(--a2-orange)"/>
        <rect class="rotor" x="12" y="2" width="40" height="2" fill="var(--a2-white)"/>
        <rect x="52" y="2" width="4" height="2" fill="var(--a2-orange)"/>
        <rect x="30" y="4" width="4" height="3" fill="var(--a2-white)"/>
        <rect x="16" y="9" width="2" height="8" fill="var(--a2-white)"/>
        <rect x="18" y="7" width="26" height="12" fill="var(--a2-white)"/>
        <rect x="19" y="9" width="8" height="8" fill="var(--a2-black)"/>
        <rect x="44" y="11" width="18" height="4" fill="var(--a2-white)"/>
        <rect x="58" y="5" width="4" height="7" fill="var(--a2-white)"/>
        <rect class="tail-rotor" x="63" y="6" width="2" height="14" fill="var(--a2-orange)"/>
        <rect x="24" y="19" width="2" height="3" fill="var(--a2-blue)"/>
        <rect x="38" y="19" width="2" height="3" fill="var(--a2-blue)"/>
        <rect x="14" y="22" width="2" height="2" fill="var(--a2-orange)"/>
        <rect x="16" y="22" width="32" height="2" fill="var(--a2-white)"/>
        <rect x="48" y="22" width="2" height="2" fill="var(--a2-orange)"/>
      </svg>
    </div>
    <div class="c64-crate">H</div>
  </div>
`;
