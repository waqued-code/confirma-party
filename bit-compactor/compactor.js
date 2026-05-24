'use strict';

// Formato de token (variable-length, lido bit a bit):
//
//   "0"  + bit                                       -> literal       (2 bits, 1 bit fonte)
//   "10" + off16 + len8                              -> ref simples   (26 bits, 1..256 bits fonte)
//   "11" + off16 + len4 + off16 + len4               -> ref pareada   (42 bits, 2..32 bits fonte)
//
// Header: 32 bits = quantidade total de bits originais (uint32 big-endian).
//
// Ref simples compensa quando length >= 14 (14*2 = 28 > 26 bits da ref).
// Ref pareada compensa quando L1+L2 >= 22 (22*2 = 44 > 42 bits da ref).
//
// Offsets sao distancias para tras (1..65536), lengths sao (1..256) ou (1..16).

const LITERAL_PREFIX_BITS = 1;
const LITERAL_VALUE_BITS = 1;
const LITERAL_TOTAL_BITS = LITERAL_PREFIX_BITS + LITERAL_VALUE_BITS;

const REF_PREFIX_BITS = 2;

const SINGLE_OFFSET_BITS = 16;
const SINGLE_LENGTH_BITS = 8;
const SINGLE_REF_BITS = REF_PREFIX_BITS + SINGLE_OFFSET_BITS + SINGLE_LENGTH_BITS; // 26
const MAX_SINGLE_DISTANCE = 1 << SINGLE_OFFSET_BITS; // 65536
const MAX_SINGLE_LENGTH = 1 << SINGLE_LENGTH_BITS; // 256
const MIN_SINGLE_LENGTH = Math.floor(SINGLE_REF_BITS / LITERAL_TOTAL_BITS) + 1; // 14

const PAIRED_OFFSET_BITS = 16;
const PAIRED_LENGTH_BITS = 4;
const PAIRED_REF_BITS =
  REF_PREFIX_BITS + 2 * (PAIRED_OFFSET_BITS + PAIRED_LENGTH_BITS); // 42
const MAX_PAIRED_DISTANCE = 1 << PAIRED_OFFSET_BITS;
const MAX_PAIRED_LENGTH = 1 << PAIRED_LENGTH_BITS; // 16
const MIN_PAIRED_TOTAL_LENGTH =
  Math.floor(PAIRED_REF_BITS / LITERAL_TOTAL_BITS) + 1; // 22

class BitWriter {
  constructor() {
    this.bytes = [];
    this.cur = 0;
    this.curBits = 0;
  }
  writeBit(b) {
    this.cur = ((this.cur << 1) | (b & 1)) & 0xff;
    this.curBits++;
    if (this.curBits === 8) {
      this.bytes.push(this.cur);
      this.cur = 0;
      this.curBits = 0;
    }
  }
  writeBits(value, count) {
    for (let i = count - 1; i >= 0; i--) {
      this.writeBit((value >>> i) & 1);
    }
  }
  finish() {
    if (this.curBits > 0) {
      this.cur = (this.cur << (8 - this.curBits)) & 0xff;
      this.bytes.push(this.cur);
    }
    return Buffer.from(this.bytes);
  }
}

class BitReader {
  constructor(buffer) {
    this.buffer = buffer;
    this.bytePos = 0;
    this.bitPos = 0;
  }
  readBit() {
    const b = (this.buffer[this.bytePos] >>> (7 - this.bitPos)) & 1;
    this.bitPos++;
    if (this.bitPos === 8) {
      this.bitPos = 0;
      this.bytePos++;
    }
    return b;
  }
  readBits(count) {
    let v = 0;
    for (let i = 0; i < count; i++) {
      v = (v << 1) | this.readBit();
    }
    return v >>> 0;
  }
}

function bufferToBits(buffer) {
  const bits = new Uint8Array(buffer.length * 8);
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    for (let j = 0; j < 8; j++) {
      bits[i * 8 + j] = (byte >>> (7 - j)) & 1;
    }
  }
  return bits;
}

function bitsToBuffer(bits, bitLength) {
  const byteLength = Math.ceil(bitLength / 8);
  const buf = Buffer.alloc(byteLength);
  for (let i = 0; i < bitLength; i++) {
    if (bits[i]) {
      buf[i >>> 3] |= 1 << (7 - (i & 7));
    }
  }
  return buf;
}

function findLongestMatch(bits, pos, maxDistance, maxLength) {
  const windowStart = Math.max(0, pos - maxDistance);
  const cap = Math.min(maxLength, bits.length - pos);
  let bestLen = 0;
  let bestStart = -1;
  for (let start = windowStart; start < pos; start++) {
    let len = 0;
    while (len < cap && bits[start + len] === bits[pos + len]) {
      len++;
    }
    if (len > bestLen) {
      bestLen = len;
      bestStart = start;
      if (len === cap) break;
    }
  }
  return { start: bestStart, length: bestLen };
}

function findBestPaired(bits, pos) {
  const m1 = findLongestMatch(bits, pos, MAX_PAIRED_DISTANCE, MAX_PAIRED_LENGTH);
  if (m1.length === 0) return null;

  let best = null;
  // Tenta varios L1 ate o maior, escolhe o par que cobre mais bits.
  for (let l1 = 1; l1 <= m1.length; l1++) {
    const m2 = findLongestMatch(
      bits,
      pos + l1,
      MAX_PAIRED_DISTANCE,
      MAX_PAIRED_LENGTH,
    );
    if (m2.length === 0) continue;
    const total = l1 + m2.length;
    if (!best || total > best.total) {
      best = {
        start1: m1.start,
        length1: l1,
        start2: m2.start,
        length2: m2.length,
        total,
      };
    }
  }

  if (!best || best.total < MIN_PAIRED_TOTAL_LENGTH) return null;
  return best;
}

function compact(inputBuffer) {
  const bits = bufferToBits(inputBuffer);
  const totalBits = bits.length;
  const writer = new BitWriter();

  writer.writeBits((totalBits >>> 16) & 0xffff, 16);
  writer.writeBits(totalBits & 0xffff, 16);

  let pos = 0;
  let literals = 0;
  let singleRefs = 0;
  let pairedRefs = 0;
  let bitsCoveredBySingles = 0;
  let bitsCoveredByPaired = 0;

  while (pos < totalBits) {
    const single = findLongestMatch(
      bits,
      pos,
      MAX_SINGLE_DISTANCE,
      MAX_SINGLE_LENGTH,
    );

    if (single.length >= MIN_SINGLE_LENGTH) {
      const distance = pos - single.start;
      writer.writeBit(1);
      writer.writeBit(0);
      writer.writeBits(distance - 1, SINGLE_OFFSET_BITS);
      writer.writeBits(single.length - 1, SINGLE_LENGTH_BITS);
      bitsCoveredBySingles += single.length;
      pos += single.length;
      singleRefs++;
      continue;
    }

    const paired = findBestPaired(bits, pos);
    if (paired) {
      const distance1 = pos - paired.start1;
      const distance2 = pos + paired.length1 - paired.start2;
      writer.writeBit(1);
      writer.writeBit(1);
      writer.writeBits(distance1 - 1, PAIRED_OFFSET_BITS);
      writer.writeBits(paired.length1 - 1, PAIRED_LENGTH_BITS);
      writer.writeBits(distance2 - 1, PAIRED_OFFSET_BITS);
      writer.writeBits(paired.length2 - 1, PAIRED_LENGTH_BITS);
      bitsCoveredByPaired += paired.total;
      pos += paired.total;
      pairedRefs++;
      continue;
    }

    writer.writeBit(0);
    writer.writeBit(bits[pos]);
    pos++;
    literals++;
  }

  const compacted = writer.finish();
  const savedBySingles =
    bitsCoveredBySingles * LITERAL_TOTAL_BITS - singleRefs * SINGLE_REF_BITS;
  const savedByPaired =
    bitsCoveredByPaired * LITERAL_TOTAL_BITS - pairedRefs * PAIRED_REF_BITS;

  return {
    compacted,
    stats: {
      originalBits: totalBits,
      originalBytes: inputBuffer.length,
      compactedBytes: compacted.length,
      literals,
      singleRefs,
      pairedRefs,
      savedBySingles,
      savedByPaired,
    },
  };
}

function expand(compactedBuffer) {
  const reader = new BitReader(compactedBuffer);
  const high = reader.readBits(16);
  const low = reader.readBits(16);
  const totalBits = high * 0x10000 + low;

  const bits = new Uint8Array(totalBits);
  let pos = 0;

  while (pos < totalBits) {
    const flag = reader.readBit();
    if (flag === 0) {
      bits[pos++] = reader.readBit();
      continue;
    }

    const composite = reader.readBit();
    if (composite === 0) {
      const distance = reader.readBits(SINGLE_OFFSET_BITS) + 1;
      const length = reader.readBits(SINGLE_LENGTH_BITS) + 1;
      const start = pos - distance;
      for (let i = 0; i < length; i++) {
        bits[pos + i] = bits[start + i];
      }
      pos += length;
    } else {
      const distance1 = reader.readBits(PAIRED_OFFSET_BITS) + 1;
      const length1 = reader.readBits(PAIRED_LENGTH_BITS) + 1;
      const distance2 = reader.readBits(PAIRED_OFFSET_BITS) + 1;
      const length2 = reader.readBits(PAIRED_LENGTH_BITS) + 1;

      const start1 = pos - distance1;
      for (let i = 0; i < length1; i++) {
        bits[pos + i] = bits[start1 + i];
      }
      pos += length1;

      const start2 = pos - distance2;
      for (let i = 0; i < length2; i++) {
        bits[pos + i] = bits[start2 + i];
      }
      pos += length2;
    }
  }

  return bitsToBuffer(bits, totalBits);
}

module.exports = {
  compact,
  expand,
  MIN_SINGLE_LENGTH,
  MIN_PAIRED_TOTAL_LENGTH,
  MAX_SINGLE_DISTANCE,
  MAX_SINGLE_LENGTH,
  MAX_PAIRED_DISTANCE,
  MAX_PAIRED_LENGTH,
  SINGLE_REF_BITS,
  PAIRED_REF_BITS,
  LITERAL_TOTAL_BITS,
};
