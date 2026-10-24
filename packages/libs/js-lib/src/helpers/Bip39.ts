import { BIP39_ENGLISH } from './Bip39English';
import { sha256 } from './HashUtil';

// BIP39 for the owner's recovery phrase: 16 bytes as 12 English words. Same encoding as odin-core's
// BIP39Util (the standard one, with a 4-bit SHA-256 checksum), so a phrase written down from either
// side reads on the other.

const ENTROPY_LENGTH = 16;
const WORD_COUNT = 12;
const CHECKSUM_BITS = 4;

const toBits = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(2).padStart(8, '0')).join('');

/** 16 bytes as 12 words. */
export const bip39Encode = async (entropy: Uint8Array): Promise<string> => {
  if (entropy.length !== ENTROPY_LENGTH) throw new Error(`A recovery phrase is ${ENTROPY_LENGTH} bytes`);

  const bits = toBits(entropy) + toBits(await sha256(entropy)).slice(0, CHECKSUM_BITS);
  const words: string[] = [];
  for (let i = 0; i < bits.length; i += 11) words.push(BIP39_ENGLISH[parseInt(bits.slice(i, i + 11), 2)]);

  return words.join(' ');
};

/**
 * 12 words back to 16 bytes. Forgiving about case and spacing, strict about the words and the
 * checksum, so a mistyped phrase is caught here.
 */
export const bip39Decode = async (phrase: string): Promise<Uint8Array> => {
  const words = phrase.trim().toLowerCase().split(/\s+/);
  if (words.length !== WORD_COUNT) throw new Error(`A recovery phrase is ${WORD_COUNT} words`);

  const bits = words
    .map((word) => {
      const index = BIP39_ENGLISH.indexOf(word);
      if (index < 0) throw new Error(`"${word}" is not a recovery phrase word`);
      return index.toString(2).padStart(11, '0');
    })
    .join('');

  const entropy = new Uint8Array(ENTROPY_LENGTH);
  for (let i = 0; i < ENTROPY_LENGTH; i++) entropy[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);

  const checksum = toBits(await sha256(entropy)).slice(0, CHECKSUM_BITS);
  if (bits.slice(ENTROPY_LENGTH * 8) !== checksum) throw new Error('The recovery phrase does not check out');

  return entropy;
};
