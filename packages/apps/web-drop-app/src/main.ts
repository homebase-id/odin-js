import './style.css';
import { DemoSource, V2Source, type DropSource } from './drop-source';
import { renderIntro } from './screens/intro';
import { renderOpen } from './screens/open';
import { renderDestructed } from './screens/destructed';

const root = document.querySelector<HTMLDivElement>('#app')!;

/**
 * Routes (under the /apps/web-drop base):
 *   /d/demo                     - mocked end to end; how the flow is felt with no server and no drive
 *   /d/{driveId}/{dropId}       - real V2 fetch. The drive id rides in the URL only until the
 *                                 WebDrop system drive exists; then this collapses to /d/{dropId}.
 * The #fragment is reserved for the decryption key and deliberately untouched here.
 */
const route = (): DropSource | null => {
  const path = window.location.pathname.replace(/^\/apps\/web-drop/, '');
  const segments = path.split('/').filter(Boolean);

  if (segments[0] !== 'd') return null;
  if (segments[1] === 'demo') return new DemoSource();
  if (segments.length === 3) return new V2Source(segments[1], segments[2]);
  return null;
};

const main = async () => {
  const source = route();
  if (!source) return renderDestructed(root, 'NO DROP AT THIS ADDRESS');

  const header = await source.fetchHeader().catch(() => null);
  if (!header) return renderDestructed(root);

  const onDestruct = () => {
    if (source instanceof DemoSource) source.destruct();
  };

  renderIntro(root, source, header, () => void renderOpen(root, source, onDestruct));
};

void main();
