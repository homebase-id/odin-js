import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from './_build/app/preview/classify.mjs';

const expectAll = (cls, mimes) => {
  for (const m of mimes) assert.equal(classify(m, 'file'), cls, `${m} -> ${cls}`);
};

test('images', () =>
  expectAll('image', [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/bmp',
    'image/svg+xml', 'image/x-icon',
  ]));

test('formats only Safari decodes get the decode fallback', () =>
  expectAll('image-maybe', ['image/heic', 'image/heif', 'image/tiff']));

test('video, with mkv tried and avi/flv/wmv given up on', () => {
  expectAll('video', ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/3gpp', 'video/x-matroska']);
  expectAll('none', ['video/x-msvideo', 'video/x-flv', 'video/x-ms-wmv']);
});

test('audio, with wma and midi given up on', () => {
  expectAll('audio', [
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/ogg', 'audio/opus', 'audio/flac',
    'audio/webm', 'audio/aiff',
  ]);
  expectAll('none', ['audio/x-ms-wma', 'audio/midi']);
});

test('pdf', () => expectAll('pdf', ['application/pdf']));

test('every text mime in the matrix', () =>
  expectAll('text', [
    'text/plain', 'text/markdown', 'text/css', 'text/html', 'text/jsx', 'text/tsx', 'text/calendar',
    'text/vcard', 'text/x-c', 'text/x-c++hdr', 'text/x-c++src', 'text/x-csharp', 'text/x-dart',
    'text/x-go', 'text/x-groovy', 'text/x-java-source', 'text/x-kotlin', 'text/x-less', 'text/x-lua',
    'text/x-perl', 'text/x-protobuf', 'text/x-python', 'text/x-r', 'text/x-ruby', 'text/x-rustsrc',
    'text/x-scss', 'text/x-swift', 'application/javascript', 'application/xml',
    'application/xhtml+xml', 'application/x-yaml', 'application/toml', 'application/graphql',
    'application/sql', 'application/x-sh', 'application/x-httpd-php', 'application/x-plist',
    'application/pgp-keys', 'message/rfc822',
  ]));

test('json and table', () => {
  expectAll('json', ['application/json']);
  expectAll('table', ['text/csv', 'text/tab-separated-values']);
});

test('every unpreviewable mime in the matrix', () =>
  expectAll('none', [
    'application/zip', 'application/x-7z-compressed', 'application/x-rar-compressed',
    'application/x-tar', 'application/gzip', 'application/x-bzip2', 'application/x-xz',
    'application/zstd', 'application/java-archive', 'application/vnd.android.package-archive',
    'application/x-itunes-ipa', 'application/x-debian-package', 'application/x-rpm',
    'application/x-apple-diskimage', 'application/x-iso9660-image', 'application/x-msdownload',
    'application/x-msi', 'application/wasm', 'application/x-sqlite3', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.ms-outlook',
    'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation', 'application/x-iwork-pages-sffpages',
    'application/x-iwork-numbers-sffnumbers', 'application/x-iwork-keynote-sffkey',
    'application/rtf', 'application/epub+zip', 'font/otf', 'font/ttf', 'font/woff', 'font/woff2',
  ]));

test('mime parameters and case are ignored', () => {
  assert.equal(classify('Text/Plain; charset=utf-8', 'a'), 'text');
  assert.equal(classify('IMAGE/PNG', 'a'), 'image');
});

test('octet-stream and empty fall back to the file extension', () => {
  assert.equal(classify('application/octet-stream', 'IMG_1.HEIC'), 'image-maybe');
  assert.equal(classify('application/octet-stream', 'README.md'), 'text');
  assert.equal(classify('', 'data.csv'), 'table');
  assert.equal(classify(undefined, 'report.docx'), 'none');
  assert.equal(classify('application/octet-stream', 'photo.jpg'), 'image');
  assert.equal(classify('application/octet-stream', 'scan.pdf'), 'pdf');
});

test('unknown values map to none', () => {
  assert.equal(classify('application/x-whatever', 'a.bin'), 'none');
  assert.equal(classify('application/octet-stream', 'noextension'), 'none');
  assert.equal(classify('application/octet-stream', 'a.unknownext'), 'none');
  assert.equal(classify('', ''), 'none');
});
