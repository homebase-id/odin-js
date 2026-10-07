export type PreviewClass =
  | 'image'
  | 'image-maybe'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'json'
  | 'table'
  | 'none';

const OCTET = 'application/octet-stream';

const IMAGE = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/bmp',
  'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon',
]);
// Safari decodes these; Chromium and Firefox do not, so the renderer falls back on error.
const IMAGE_MAYBE = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence', 'image/tiff']);

// mkv is tried as <video> (some browsers play it); avi, flv and wmv never will, so they are 'none'.
const VIDEO = new Set([
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/3gpp', 'video/x-matroska',
]);

const AUDIO = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav',
  'audio/wave', 'audio/ogg', 'audio/opus', 'audio/flac', 'audio/x-flac', 'audio/webm', 'audio/aiff',
  'audio/x-aiff',
]);

const TEXT = new Set([
  'text/plain', 'text/markdown', 'text/css', 'text/html', 'text/jsx', 'text/tsx', 'text/calendar',
  'text/vcard', 'text/x-c', 'text/x-c++hdr', 'text/x-c++src', 'text/x-csharp', 'text/x-dart',
  'text/x-go', 'text/x-groovy', 'text/x-java-source', 'text/x-kotlin', 'text/x-less', 'text/x-lua',
  'text/x-perl', 'text/x-protobuf', 'text/x-python', 'text/x-r', 'text/x-ruby', 'text/x-rustsrc',
  'text/x-scss', 'text/x-swift', 'text/xml', 'text/yaml', 'text/javascript',
  'application/javascript', 'application/x-javascript', 'application/xml', 'application/xhtml+xml',
  'application/x-yaml', 'application/yaml', 'application/toml', 'application/graphql',
  'application/sql', 'application/x-sh', 'application/x-httpd-php', 'application/x-plist',
  'application/pgp-keys', 'message/rfc822',
]);

const TABLE = new Set(['text/csv', 'text/tab-separated-values']);

// Mirrors chat-kmp ContentTypeUtil's extension table, for files whose mime arrived as octet-stream.
const EXTENSION_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif',
  heic: 'image/heic', heif: 'image/heif', tiff: 'image/tiff', tif: 'image/tiff',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', avi: 'video/x-msvideo',
  mkv: 'video/x-matroska', m4v: 'video/x-m4v', '3gp': 'video/3gpp', flv: 'video/x-flv',
  wmv: 'video/x-ms-wmv',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac',
  aac: 'audio/aac', opus: 'audio/opus', weba: 'audio/webm', wma: 'audio/x-ms-wma',
  mid: 'audio/midi', midi: 'audio/midi', aiff: 'audio/aiff', aif: 'audio/aiff',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation', rtf: 'application/rtf',
  pdf: 'application/pdf', epub: 'application/epub+zip',
  txt: 'text/plain', log: 'text/plain', md: 'text/markdown', markdown: 'text/markdown',
  cfg: 'text/plain', conf: 'text/plain', ini: 'text/plain', env: 'text/plain', properties: 'text/plain',
  html: 'text/html', htm: 'text/html', xml: 'application/xml', xhtml: 'application/xhtml+xml',
  css: 'text/css', scss: 'text/x-scss', less: 'text/x-less', yaml: 'application/x-yaml',
  yml: 'application/x-yaml', toml: 'application/toml',
  js: 'application/javascript', mjs: 'application/javascript', jsx: 'text/jsx', tsx: 'text/tsx',
  json: 'application/json', csv: 'text/csv', tsv: 'text/tab-separated-values',
  sh: 'application/x-sh', bash: 'application/x-sh', zsh: 'application/x-sh',
  py: 'text/x-python', kt: 'text/x-kotlin', kts: 'text/x-kotlin', java: 'text/x-java-source',
  swift: 'text/x-swift', c: 'text/x-c', cpp: 'text/x-c++src', h: 'text/x-c', hpp: 'text/x-c++hdr',
  cs: 'text/x-csharp', go: 'text/x-go', rs: 'text/x-rustsrc', rb: 'text/x-ruby',
  php: 'application/x-httpd-php', pl: 'text/x-perl', lua: 'text/x-lua', r: 'text/x-r',
  sql: 'application/sql', graphql: 'application/graphql', proto: 'text/x-protobuf',
  gradle: 'text/x-groovy', groovy: 'text/x-groovy', dart: 'text/x-dart',
  plist: 'application/x-plist', asc: 'application/pgp-keys', ics: 'text/calendar',
  vcf: 'text/vcard', eml: 'message/rfc822',
};

const normalizeMime = (contentType: string | undefined): string =>
  (contentType ?? '').split(';')[0].trim().toLowerCase();

const mimeFromFileName = (fileName: string | undefined): string => {
  const dot = (fileName ?? '').lastIndexOf('.');
  if (dot < 0) return OCTET;
  return EXTENSION_MIME[fileName!.slice(dot + 1).toLowerCase()] ?? OCTET;
};

export function classify(contentType: string | undefined, fileName?: string): PreviewClass {
  let mime = normalizeMime(contentType);
  if (!mime || mime === OCTET) mime = mimeFromFileName(fileName);

  if (IMAGE.has(mime)) return 'image';
  if (IMAGE_MAYBE.has(mime)) return 'image-maybe';
  if (VIDEO.has(mime)) return 'video';
  if (AUDIO.has(mime)) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'application/json' || mime.endsWith('+json')) return 'json';
  if (TABLE.has(mime)) return 'table';
  if (TEXT.has(mime)) return 'text';
  // An image or text type this table has never heard of is still worth a try / a plain-text view.
  if (mime.startsWith('image/')) return 'image-maybe';
  if (mime.startsWith('text/')) return 'text';
  return 'none';
}
