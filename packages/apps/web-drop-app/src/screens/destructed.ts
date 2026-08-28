/**
 * Shown at countdown zero, and for any 404 - expired, burned, or never existed. The server
 * deliberately does not say which, and neither do we.
 */
export function renderDestructed(root: HTMLElement, headline = 'THIS DROP HAS SELF-DESTRUCTED') {
  root.innerHTML = `
    <main class="screen destructed">
      <header class="masthead">
        <img class="logo" src="./odin-logo.svg" alt="Homebase" />
        <h1 class="wordmark">WEB<span>DROP</span></h1>
      </header>

      <p class="glitch" data-text="${headline}">${headline}</p>
      <p class="epitaph">Whatever was here is gone. There is no recovery, and no record.</p>
    </main>
  `;
}
