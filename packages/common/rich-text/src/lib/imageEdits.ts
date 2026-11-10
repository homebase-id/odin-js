/**
 * Non-destructive image edits (#584): crop, rotate and flip are node attrs applied at
 * display time with CSS. The image bytes are never re-encoded, so clearing the attrs
 * restores the original.
 *
 * - `crop` is { x, y, w, h } as fractions of the original (unrotated) image.
 * - `rotate` is clockwise, in degrees. `flipH` / `flipV` mirror what is shown, after
 *   the rotation, so "flip horizontal" always mirrors left and right on screen.
 *
 * The edited box is the crop turned by the rotation. Its aspect ratio needs the
 * image's natural size, which the renderer reads off the loaded <img>.
 */
import type { CSSProperties } from 'react';

export interface ImageCrop {
    x: number;
    y: number;
    w: number;
    h: number;
}
export type ImageRotation = 0 | 90 | 180 | 270;
export interface ImageEdits {
    crop: ImageCrop | null;
    rotate: ImageRotation;
    flipH: boolean;
    flipV: boolean;
}
export interface Size {
    width: number;
    height: number;
}

export const NO_EDITS: ImageEdits = { crop: null, rotate: 0, flipH: false, flipV: false };
export const FULL_CROP: ImageCrop = { x: 0, y: 0, w: 1, h: 1 };
/** The smallest crop side, as a fraction of the image. */
export const MIN_CROP = 0.05;

const ROTATIONS: readonly number[] = [0, 90, 180, 270];
const round4 = (n: number) => Math.round(n * 10000) / 10000;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const quarterTurn = (rotate: ImageRotation) => rotate === 90 || rotate === 270;

/** A valid crop rounded to 4 decimals, or null for none (or the whole image). */
export function normalizeCrop(value: unknown): ImageCrop | null {
    if (!value || typeof value !== 'object') return null;
    const { x, y, w, h } = value as Record<string, unknown>;
    if (![x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
    const left = round4(clamp(x as number, 0, 1));
    const top = round4(clamp(y as number, 0, 1));
    const crop = {
        x: left,
        y: top,
        w: round4(clamp(w as number, 0, 1 - left)),
        h: round4(clamp(h as number, 0, 1 - top)),
    };
    if (crop.w <= 0 || crop.h <= 0) return null;
    if (crop.x === 0 && crop.y === 0 && crop.w === 1 && crop.h === 1) return null;
    return crop;
}

/** The edits stored on an image node's attrs; anything absent or invalid is unedited. */
export function readEdits(attrs: Record<string, unknown>): ImageEdits {
    const rotate = Number(attrs.rotate);
    return {
        crop: normalizeCrop(attrs.crop),
        rotate: (ROTATIONS.includes(rotate) ? rotate : 0) as ImageRotation,
        flipH: attrs.flipH === true,
        flipV: attrs.flipV === true,
    };
}

export function hasEdits(edits: ImageEdits): boolean {
    return !!edits.crop || edits.rotate !== 0 || edits.flipH || edits.flipV;
}

/** Node attrs for `edits`. Unedited parts are null, so they stay absent from the doc. */
export function editAttrs(edits: ImageEdits) {
    return {
        crop: normalizeCrop(edits.crop),
        rotate: edits.rotate || null,
        flipH: edits.flipH || null,
        flipV: edits.flipV || null,
    };
}

/** The HTML/markdown form: `data-crop="x,y,w,h"`, `data-rotate="90"`, `data-flip="h|v|hv"`. */
export function editDataAttrs(edits: ImageEdits): [string, string][] {
    const out: [string, string][] = [];
    const crop = normalizeCrop(edits.crop);
    if (crop) out.push(['data-crop', [crop.x, crop.y, crop.w, crop.h].join(',')]);
    if (edits.rotate) out.push(['data-rotate', String(edits.rotate)]);
    const flip = `${edits.flipH ? 'h' : ''}${edits.flipV ? 'v' : ''}`;
    if (flip) out.push(['data-flip', flip]);
    return out;
}

/** Reads the data attributes `editDataAttrs` writes. */
export function parseEditData(get: (name: string) => string | null | undefined): ImageEdits {
    const [x, y, w, h] = (get('data-crop') ?? '').split(',').map((n) => (n.trim() ? Number(n) : NaN));
    const flip = get('data-flip') ?? '';
    return readEdits({
        crop: { x, y, w, h },
        rotate: get('data-rotate'),
        flipH: flip.includes('h'),
        flipV: flip.includes('v'),
    });
}

/** Pixel size of the edited box: the crop of `natural`, turned by the rotation. */
export function editedSize(natural: Size, edits: ImageEdits): Size {
    const crop = edits.crop ?? FULL_CROP;
    const width = natural.width * crop.w;
    const height = natural.height * crop.h;
    return quarterTurn(edits.rotate) ? { width: height, height: width } : { width, height };
}

const pct = (n: number) => `${round4(n * 100)}%`;

/**
 * CSS for the three layers of an edited image: the `frame` (the edited box, clips),
 * the `stage` (the crop, unrotated, centred and then turned and mirrored) and the
 * `image` (the whole original, offset so the crop fills the stage).
 */
export function editLayers(natural: Size, edits: ImageEdits): { frame: CSSProperties; stage: CSSProperties; image: CSSProperties } {
    const crop = edits.crop ?? FULL_CROP;
    const box = editedSize(natural, edits);
    const turned = quarterTurn(edits.rotate);
    return {
        frame: { position: 'relative', overflow: 'hidden', aspectRatio: `${box.width} / ${box.height}` },
        stage: {
            position: 'absolute',
            left: '50%',
            top: '50%',
            // A quarter turn swaps the sides: the stage is as wide as the frame is tall.
            width: turned ? pct(box.height / box.width) : '100%',
            height: turned ? pct(box.width / box.height) : '100%',
            // Applied right to left: turn, then mirror on screen, then centre.
            transform: `translate(-50%, -50%) scale(${edits.flipH ? -1 : 1}, ${edits.flipV ? -1 : 1}) rotate(${edits.rotate}deg)`,
        },
        image: {
            position: 'absolute',
            left: pct(-crop.x / crop.w),
            top: pct(-crop.y / crop.h),
            width: pct(1 / crop.w),
            height: pct(1 / crop.h),
            maxWidth: 'none',
        },
    };
}

type Point = [number, number];

/** A point of the original image (fractions) to where it shows after rotate and flip. */
function toDisplayPoint([u, v]: Point, edits: ImageEdits): Point {
    let [x, y]: Point =
        edits.rotate === 90 ? [1 - v, u] : edits.rotate === 180 ? [1 - u, 1 - v] : edits.rotate === 270 ? [v, 1 - u] : [u, v];
    if (edits.flipH) x = 1 - x;
    if (edits.flipV) y = 1 - y;
    return [x, y];
}

function fromDisplayPoint([x, y]: Point, edits: ImageEdits): Point {
    if (edits.flipH) x = 1 - x;
    if (edits.flipV) y = 1 - y;
    return edits.rotate === 90 ? [y, 1 - x] : edits.rotate === 180 ? [1 - x, 1 - y] : edits.rotate === 270 ? [1 - y, x] : [x, y];
}

function mapRect(rect: ImageCrop, map: (p: Point) => Point): ImageCrop {
    const [x1, y1] = map([rect.x, rect.y]);
    const [x2, y2] = map([rect.x + rect.w, rect.y + rect.h]);
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}

/** The crop as a rect over the rotated and flipped whole image (what the edit dialog shows). */
export const toDisplayCrop = (edits: ImageEdits): ImageCrop => mapRect(edits.crop ?? FULL_CROP, (p) => toDisplayPoint(p, edits));

/** A rect drawn over the rotated and flipped image, back to a crop of the original. */
export const fromDisplayCrop = (rect: ImageCrop, edits: ImageEdits): ImageCrop | null =>
    normalizeCrop(mapRect(rect, (p) => fromDisplayPoint(p, edits)));

/**
 * Rotate a quarter turn as seen on screen (`dir` 1 = right). With one flip on, the
 * stored rotation runs the other way, since the mirror is applied after it.
 */
export function rotateEdits(edits: ImageEdits, dir: 1 | -1): ImageEdits {
    const step = edits.flipH !== edits.flipV ? -dir : dir;
    return { ...edits, rotate: ((edits.rotate + step * 90 + 360) % 360) as ImageRotation };
}

/**
 * The largest centred rect of pixel ratio `ratio` (w/h) over an image shown at
 * `aspect` (w/h), in fractions of that image.
 */
export function centeredCrop(ratio: number, aspect: number): ImageCrop {
    const w = ratio > aspect ? 1 : ratio / aspect;
    const h = ratio > aspect ? aspect / ratio : 1;
    return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Moves one corner of `rect` to (px, py), keeping the opposite corner fixed. With a
 * `ratio` (pixel w/h, over an image shown at `aspect`), the height follows the width.
 */
export function dragCorner(rect: ImageCrop, corner: Corner, px: number, py: number, ratio: number | null, aspect: number): ImageCrop {
    const west = corner[1] === 'w';
    const north = corner[0] === 'n';
    const ax = west ? rect.x + rect.w : rect.x;
    const ay = north ? rect.y + rect.h : rect.y;
    const maxW = west ? ax : 1 - ax;
    const maxH = north ? ay : 1 - ay;
    let w = clamp(west ? ax - px : px - ax, MIN_CROP, maxW);
    let h = clamp(north ? ay - py : py - ay, MIN_CROP, maxH);
    if (ratio) {
        const k = aspect / ratio;
        h = w * k;
        if (h > maxH) {
            h = maxH;
            w = h / k;
        }
    }
    return { x: west ? ax - w : ax, y: north ? ay - h : ay, w, h };
}

/** Moves `rect` by (dx, dy), kept inside the image. */
export function moveCrop(rect: ImageCrop, dx: number, dy: number): ImageCrop {
    return { ...rect, x: clamp(rect.x + dx, 0, 1 - rect.w), y: clamp(rect.y + dy, 0, 1 - rect.h) };
}
