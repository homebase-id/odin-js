// Cross-origin favicons mostly lack CORS headers: html-to-image's re-fetch of them rejects the whole export
export const snapshotFilter = (node: Node) =>
  !(node as Element).hasAttribute?.('data-card-optional');
