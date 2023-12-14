export const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && (window as any)?.CustomBlob) || Blob;
