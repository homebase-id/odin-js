import type { PreviewClass } from './classify';

// Every user-facing string of the view-only previews, in one place for a future translation pass.
export const PREVIEW_STRINGS = {
  kind: {
    image: 'image',
    'image-maybe': 'image',
    video: 'video',
    audio: 'audio',
    pdf: 'document',
    text: 'text',
    json: 'data',
    table: 'table',
    none: 'file',
  } satisfies Record<PreviewClass, string>,
  shownAsSource: 'Shown as plain text',
  scrollRegion: (name: string) => `Contents of ${name}`,
  pdfLoading: 'Loading PDF…',
  pdfFailed: { title: "Can't show this PDF", body: "This PDF can't be shown in this browser." },
  pdfCapped: (max: number) => `Only the first ${max} pages are shown.`,
  imageFailed: { title: "Can't show this image", body: "This image can't be shown in this browser." },
  heicFailed: {
    title: "Can't show this photo here",
    body: "This photo format can't be shown in this browser. Try Safari on iPhone, iPad or Mac.",
  },
  videoFailed: { title: "Can't play this video", body: "This video can't be played in this browser." },
  audioFailed: { title: "Can't play this audio", body: "This audio can't be played in this browser." },
  tableCapped: (max: number) => `Only the first ${max} rows are shown.`,
  truncated: 'Truncated: only the first 2 MB are shown.',
  unavailableTitle: 'Preview not available',
  unavailableBody: "This file type can't be previewed in a browser. View-only drops don't offer downloads.",
};
