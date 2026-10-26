// Shamir secret sharing, as odin-core's ShamirSecretSharing.cs does it, so either side rebuilds what
// the other split: the same 257-bit prime, x = 1..n, and each shard's value as unsigned big-endian
// bytes with no leading zeros (BouncyCastle's ToByteArrayUnsigned), so a shard is 32 or 33 bytes.

const PRIME = BigInt(
  '189329554115601632036302071042466348524091279005500917236488474462559403412027'
);

export interface ShamirShard {
  index: number;
  shard: Uint8Array;
}

const mod = (a: bigint, m: bigint) => ((a % m) + m) % m;

const toBigInt = (bytes: Uint8Array) =>
  bytes.reduce((value, byte) => (value << BigInt(8)) | BigInt(byte), BigInt(0));

const toUnsignedBytes = (value: bigint): Uint8Array => {
  const bytes: number[] = [];
  for (let v = value; v > BigInt(0); v >>= BigInt(8)) bytes.unshift(Number(v & BigInt(0xff)));
  return new Uint8Array(bytes);
};

const padTo = (bytes: Uint8Array, length: number) => {
  if (bytes.length >= length) return bytes;
  const padded = new Uint8Array(length);
  padded.set(bytes, length - bytes.length);
  return padded;
};

const modPow = (base: bigint, exp: bigint, m: bigint) => {
  let result = BigInt(1);
  let b = mod(base, m);
  for (let e = exp; e > BigInt(0); e >>= BigInt(1)) {
    if (e & BigInt(1)) result = (result * b) % m;
    b = (b * b) % m;
  }
  return result;
};

/** A uniformly random value mod the prime: 128 bits more than the prime, then reduced, as odin-core. */
const randomCoefficient = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil((257 + 128) / 8)));
  const r = mod(toBigInt(bytes), PRIME);
  return r === BigInt(0) ? BigInt(1) : r;
};

export const splitSecret = (totalShards: number, minShards: number, secret: Uint8Array): ShamirShard[] => {
  if (totalShards < minShards) throw new Error('Total shards must be >= minimum shards.');
  if (minShards < 2) throw new Error('Minimum shards must be at least 2.');
  if (secret.length === 0) throw new Error('Secret cannot be empty.');

  const secretInt = toBigInt(secret);
  if (secretInt >= PRIME) throw new Error('Secret is too large for the fixed prime.');

  const coefficients = [secretInt];
  for (let i = 1; i < minShards; i++) coefficients.push(randomCoefficient());

  const shards: ShamirShard[] = [];
  for (let x = 1; x <= totalShards; x++) {
    let accum = secretInt;
    for (let exp = 1; exp < minShards; exp++) {
      accum = mod(accum + coefficients[exp] * modPow(BigInt(x), BigInt(exp), PRIME), PRIME);
    }
    shards.push({ index: x, shard: toUnsignedBytes(accum) });
  }

  return shards;
};

const modInverse = (k: bigint) => modPow(mod(k, PRIME), PRIME - BigInt(2), PRIME);

/**
 * Rebuilds the secret. `secretLength` restores leading zero bytes: the shards carry only the
 * secret's value. Too few shards rebuild a wrong value, which fails where the secret is used.
 */
export const rebuildSecret = (shards: ShamirShard[], secretLength: number): Uint8Array => {
  if (shards.length < 2) throw new Error('At least 2 shares are required for reconstruction.');

  let accum = BigInt(0);
  for (const current of shards) {
    let numerator = BigInt(1);
    let denominator = BigInt(1);
    for (const other of shards) {
      if (other === current) continue;
      numerator = mod(numerator * BigInt(-other.index), PRIME);
      denominator = mod(denominator * BigInt(current.index - other.index), PRIME);
    }
    accum = mod(accum + toBigInt(current.shard) * numerator * modInverse(denominator), PRIME);
  }

  return padTo(toUnsignedBytes(accum), secretLength);
};
