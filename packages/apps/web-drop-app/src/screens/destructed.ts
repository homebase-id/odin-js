/**
 * Shown at countdown zero, on the recipient's own "destroy it now", and for any 404 - expired,
 * burned, or never existed; the server deliberately does not say which.
 *
 * This screen is the product's best ad: the drop kept its promise, everything else is gone, and
 * the invitation is the only thing left standing - so the CTA is a card here, not a footer line.
 */
export function renderDestructed(
  root: HTMLElement,
  headline = 'THIS DROP HAS SELF-DESTRUCTED',
  linkDiesAtMs?: number
) {
  const isChoplifter = document.body.classList.contains('theme-choplifter');

  // The page has destroyed its copy; the LINK dies on the server's clock. Say so when we know it.
  const linkLine = linkDiesAtMs
    ? `<p class="epitaph">The link itself burns out at ${new Date(linkDiesAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</p>`
    : '';

  root.innerHTML = `
    <main class="screen destructed">
      <header class="masthead">
        <img class="logo" src="./odin-logo.svg" alt="Homebase" />
        <h1 class="wordmark">WEB<span>DROP</span></h1>
      </header>

      <p class="glitch" data-text="${headline}">${headline}</p>
      <p class="epitaph">Whatever was here is gone. There is no recovery, and no record.</p>
      ${linkLine}

      <section class="cta-card">
        <p class="cta-pitch">
          Files that arrive encrypted, keep their promise, and leave nothing behind.
          That is how sharing should work.
        </p>
        <a class="cta-button" href="https://homebase.id" target="_blank" rel="noopener">
          This is cool &mdash; I want a Homebase account too
        </a>
      </section>

      ${isChoplifter ? '<p class="c64-ready">READY.<span class="c64-cursor"></span></p>' : ''}
    </main>
  `;
}
