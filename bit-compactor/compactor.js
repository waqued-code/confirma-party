'use strict';

const FLAG_BITS = 1;
const LITERAL_VALUE_BITS = 1;
const OFFSET_BITS = 16;
const LENGTH_BITS = 8;

const REF_TOKEN_BITS = FLAG_BITS + OFFSET_BITS + LENGTH_BITS;
const LITERAL_TOKEN_BITS = FLAG_BITS + LITERAL_VALUE_BITS;

const MIN_REF_LENGTH = REF_TOKEN_BITS + 1;
const MAX_DISTANCE = 1 << OFFSET_BITS;
const MAX_LENGTH = 1 << LENGTH_BITS;

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

function findLongestMatch(bits, pos) {
  const windowStart = Math.max(0, pos - MAX_DISTANCE);
  const maxLen = Math.min(MAX_LENGTH, bits.length - pos);
  let bestLen = 0;
  let bestStart = -1;
  for (let start = windowStart; start < pos; start++) {
    let len = 0;
    while (len < maxLen && bits[start + len] === bits[pos + len]) {
      len++;
    }
    if (len > bestLen) {
      bestLen = len;
      bestStart = start;
      if (len === maxLen) break;
    }
  }
  return { start: bestStart, length: bestLen };
}

function compact(inputBuffer) {
  const bits = bufferToBits(inputBuffer);
  const totalBits = bits.length;
  const writer = new BitWriter();

  writer.writeBits((totalBits >>> 16) & 0xffff, 16);
  writer.writeBits(totalBits & 0xffff, 16);

  let pos = 0;
  let literals = 0;
  let refs = 0;
  let savedBits = 0;

  while (pos < totalBits) {
    const { start, length } = findLongestMatch(bits, pos);

    if (length >= MIN_REF_LENGTH && start >= 0) {
      const distance = pos - start;
      writer.writeBit(1);
      writer.writeBits(distance - 1, OFFSET_BITS);
      writer.writeBits(length - 1, LENGTH_BITS);
      savedBits += length - REF_TOKEN_BITS;
      pos += length;
      refs++;
    } else {
      writer.writeBit(0);
      writer.writeBit(bits[pos]);
      pos++;
      literals++;
    }
  }

  const compacted = writer.finish();
  return {
    compacted,
    stats: {
      originalBits: totalBits,
      originalBytes: inputBuffer.length,
      compactedBytes: compacted.length,
      literals,
      refs,
      savedBitsByRefs: savedBits,
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
    } else {
      const distance = reader.readBits(OFFSET_BITS) + 1;
      const length = reader.readBits(LENGTH_BITS) + 1;
      const start = pos - distance;
      for (let i = 0; i < length; i++) {
        bits[pos + i] = bits[start + i];
      }
      pos += length;
    }
  }

  return bitsToBuffer(bits, totalBits);
}

module.exports = {
  compact,
  expand,
  MIN_REF_LENGTH,
  MAX_DISTANCE,
  MAX_LENGTH,
  REF_TOKEN_BITS,
  LITERAL_TOKEN_BITS,
};
