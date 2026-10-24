// The IEEE CRC-32 that zlib computes (check value: crc32("123456789") = 0xcbf43926). odin-core's
// `CRC32C.CalculateCRC32C` is this one too, despite its name; a seal's key id is it of the
// recipient's public key (ZkSeal in odin-core).

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of data) crc = TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
