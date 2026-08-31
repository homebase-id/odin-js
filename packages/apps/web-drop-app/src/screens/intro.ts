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

  const destructLine =
    header.ttl < 0
      ? 'It will self-destruct when you open it.'
      : header.ttl > 0
        ? 'It is already counting down.'
        : 'It does not expire.';

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

      <footer class="fineprint">delivered over Homebase &middot; no account required</footer>
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
    <div class="c64-sun"></div>
    <div class="c64-dune c64-dune-far"></div>
    <div class="c64-dune c64-dune-near"></div>
    <div class="c64-pad"></div>
    <div class="c64-flag"><div class="c64-flag-cloth">H</div></div>
    <div class="c64-chopper">
      <svg viewBox="0 0 64 28" shape-rendering="crispEdges">
        <rect class="rotor" x="6" y="2" width="44" height="2"/>
        <rect x="26" y="4" width="4" height="4" fill="var(--c64-dgrey)"/>
        <rect x="14" y="8" width="28" height="10" fill="var(--c64-lgrey)"/>
        <rect x="14" y="8" width="10" height="6" fill="var(--c64-black)"/>
        <rect x="42" y="10" width="16" height="4" fill="var(--c64-lgrey)"/>
        <rect class="tail-rotor" x="58" y="6" width="2" height="12"/>
        <rect x="18" y="18" width="2" height="4" fill="var(--c64-dgrey)"/>
        <rect x="34" y="18" width="2" height="4" fill="var(--c64-dgrey)"/>
        <rect x="12" y="22" width="30" height="2" fill="var(--c64-dgrey)"/>
      </svg>
    </div>
    <div class="c64-crate">H</div>
  </div>
`;
