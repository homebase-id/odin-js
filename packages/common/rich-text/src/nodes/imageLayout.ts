/**
 * Geometry for the image node view. Lives apart from ImageNode.tsx because that
 * file may only export the component itself (react-refresh), and because
 * extensions.ts needs ALIGN_STYLE without pulling in React.
 */

export const MIN_IMAGE_WIDTH = 64;

export type ImageAlign = "left" | "center" | "right";

/**
 * Float styles for an aligned image. Left/right float so text wraps around the
 * image; center is a block with auto margins, which needs the explicit width the
 * resize handles set.
 *
 * ponytail: every key here must stay a single-word CSS property — extensions.ts
 * serialises this same map into the exported <img>'s style string, so a camelCase
 * key would come out as invalid CSS. Deliberately no `width`: it would fight the
 * pixel width in that same string.
 */
export const ALIGN_STYLE: Record<ImageAlign, Record<string, string>> = {
  left: { float: "left", margin: "0 1rem 0.5rem 0" },
  right: { float: "right", margin: "0 0 0.5rem 1rem" },
  center: { display: "block", margin: "0 auto" },
};

/**
 * Which of the three image renderings a node gets.
 *
 * ponytail: the order is the whole point. `src` and `data-pending-id` are separate
 * Yjs map keys, so a merge can leave a node with a promoted `attachment://` src AND
 * a stale pending marker. Testing the scheme first means the promoted src always
 * wins — `attachment://` is an internal placeholder, and handing it to a real <img>
 * gets ERR_UNKNOWN_URL_SCHEME under a spinner that never stops.
 */
export function imageRenderMode(src: string, pendingId?: string | null) {
  if (src.startsWith("attachment://")) return "attachment";
  if (pendingId || src.startsWith("blob:")) return "pending";
  return "plain";
}

/**
 * Whether the mode's src is stable enough to open in the full-size lightbox.
 * Not "pending": the node's own src is a blob: URL that's already dead by the
 * time it's clicked (it dies with the tab, per imageRenderMode above).
 */
export function canZoom(mode: ReturnType<typeof imageRenderMode>): boolean {
  return mode !== "pending";
}

/**
 * Width the resize box gets. Shrink-wrapping keeps the corner handles on the
 * image rather than out at the column edge.
 *
 * ponytail: attachments are the exception and must stay a definite width.
 * OdinImage is declaratively 100% wide and paints nothing in flow until it has
 * chosen a thumbnail size — which it chooses by measuring this very box. Let the
 * box shrink-wrap and that measurement is 0, so it never chooses a size, never
 * renders, and the image silently disappears. An edited image (#584) is the same:
 * its img is positioned inside a frame, so there is nothing to shrink-wrap.
 */
export function imageBoxWidth(
  mode: ReturnType<typeof imageRenderMode>,
  width?: number | null,
  edited = false,
): number | string {
  if (width) return width;
  return mode === "attachment" || edited ? "100%" : "fit-content";
}

/**
 * Width a drag to `clientX` produces. Left-side handles mirror the delta so both
 * sides grow outward, and the result is clamped to the content column. Height is
 * never stored, so the aspect ratio is preserved by construction.
 */
export function resizeWidth(
  side: "left" | "right",
  startWidth: number,
  startX: number,
  clientX: number,
  maxWidth: number,
): number {
  const delta = side === "right" ? clientX - startX : startX - clientX;
  return Math.round(
    Math.min(Math.max(startWidth + delta, MIN_IMAGE_WIDTH), maxWidth),
  );
}
