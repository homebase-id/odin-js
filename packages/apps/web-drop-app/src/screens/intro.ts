import type { DropHeader, DropSource } from '../drop-source';

const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;

/**
 * The consent screen. Only the header has been fetched to get here - a header read does not start
 * the TTL clock, so a prefetching mail scanner landing on this page costs the drop nothing.
 */
export function renderIntro(root: HTMLElement, source: DropSource, header: DropHeader, onOpen: () => void) {
  const count = header.payloads.length;
  const totalBytes = header.payloads.reduce((sum, p) => sum + p.bytesWritten, 0);

  const destructLine =
    header.ttl < 0
      ? 'It will self-destruct when you open it.'
      : header.ttl > 0
        ? 'It is already counting down.'
        : 'It does not expire.';

  root.innerHTML = `
    <main class="screen">
      <header class="masthead">
        <img class="logo" src="./odin-logo.svg" alt="Homebase" />
        <h1 class="wordmark">WEB<span>DROP</span></h1>
      </header>

      <p class="transmission typewriter">
        <span class="sender">${source.sender}</span> has sent you a WebDrop. ${destructLine}
      </p>

      <p class="manifest">
        ${count} file${count === 1 ? '' : 's'} &middot; ${formatBytes(totalBytes)} &middot; encrypted in transit
      </p>

      <label class="consent">
        <input type="checkbox" id="consent" />
        <span>
          This drop is for me alone. I agree to respect the confidentiality and privacy of
          <span class="sender">${source.sender}</span> and will not share its contents.
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
