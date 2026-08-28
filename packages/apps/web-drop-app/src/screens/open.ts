import type { DropSource } from '../drop-source';
import { renderDestructed } from './destructed';

interface Downloaded {
  key: string;
  name: string;
  contentType: string;
  url: string; // object URL over the already-fetched bytes; no second round trip
}

const pad = (n: number) => String(n).padStart(2, '0');

const formatRemaining = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  return h > 0 ? `${pad(h)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

/**
 * The open screen: fetch every payload (the FIRST payload fetch is what starts the server-side
 * clock), re-read the header for the resolved absolute Ttl, then count down against it.
 */
export async function renderOpen(root: HTMLElement, source: DropSource, onDestruct: () => void) {
  const header = await source.fetchHeader();
  if (!header) return renderDestructed(root);

  const files: Downloaded[] = [];
  for (const payload of header.payloads) {
    const blob = await source.fetchPayload(payload.key);
    if (blob) {
      files.push({
        key: payload.key,
        name: payload.name,
        contentType: payload.contentType,
        url: URL.createObjectURL(blob),
      });
    }
  }

  if (files.length === 0) return renderDestructed(root);

  // The clock started on the first payload fetch above; the header now carries the absolute time.
  const resolved = await source.fetchHeader();
  const deadline = resolved && resolved.ttl > 0 ? resolved.ttl : 0;
  const fuseTotal = deadline > 0 ? deadline - Date.now() : 0;

  root.innerHTML = `
    <main class="screen">
      <header class="masthead">
        <img class="logo" src="./odin-logo.svg" alt="Homebase" />
        <h1 class="wordmark">WEB<span>DROP</span></h1>
      </header>

      ${
        deadline > 0
          ? `<section class="countdown-block">
               <p class="countdown-label">This drop will self-destruct in</p>
               <p id="countdown" class="countdown">--:--</p>
               <div class="fuse"><div id="fuse-burn" class="fuse-burn"></div></div>
             </section>`
          : '<p class="countdown-label">This drop does not expire.</p>'
      }

      <ul class="payloads">
        ${files
          .map(
            (f) => `
          <li class="payload">
            <span class="payload-icon" aria-hidden="true">&#8595;</span>
            <a href="${f.url}" download="${f.name}">${f.name}</a>
            <span class="payload-type">${f.contentType}</span>
          </li>`
          )
          .join('')}
      </ul>

      <footer class="fineprint">save what you need &middot; the drop will not wait</footer>
    </main>
  `;

  if (deadline <= 0) return;

  const countdown = root.querySelector<HTMLElement>('#countdown')!;
  const fuse = root.querySelector<HTMLElement>('#fuse-burn')!;

  const destruct = () => {
    clearInterval(timer);
    for (const f of files) URL.revokeObjectURL(f.url);
    onDestruct();
    renderDestructed(root);
  };

  const tick = () => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return destruct();

    countdown.textContent = formatRemaining(remaining);
    const fraction = fuseTotal > 0 ? remaining / fuseTotal : 0;
    fuse.style.width = `${(fraction * 100).toFixed(2)}%`;

    countdown.classList.toggle('amber', fraction <= 0.5 && fraction > 0.2);
    countdown.classList.toggle('critical', fraction <= 0.2);
  };

  const timer = setInterval(tick, 250);
  tick();
}
