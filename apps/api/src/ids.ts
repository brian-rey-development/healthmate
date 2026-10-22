import type { Clock, IdGenerator } from '@healthmate/core';

const TIMESTAMP_BYTES = 6;
const RANDOM_BYTES = 10;
const BYTE_VALUES = 256;
const VERSION_7 = 0x70;
const VARIANT_RFC_4122 = 0x80;
const LOW_NIBBLE = 0x0f;
const LOW_SIX_BITS = 0x3f;
const VERSION_BYTE = 0;
const VARIANT_BYTE = 2;
const UUID_GROUPS = [8, 4, 4, 4, 12];

const timestampBytes = (ms: number): number[] =>
  Array.from({ length: TIMESTAMP_BYTES }, (_, i) => Math.floor(ms / BYTE_VALUES ** (TIMESTAMP_BYTES - 1 - i)) % BYTE_VALUES);

const shapeRandomByte = (byte: number, index: number): number => {
  if (index === VERSION_BYTE) return VERSION_7 | (byte & LOW_NIBBLE);
  if (index === VARIANT_BYTE) return VARIANT_RFC_4122 | (byte & LOW_SIX_BITS);
  return byte;
};

const toHex = (bytes: readonly number[]): string => bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');

const groupUuid = (hex: string): string => {
  const offsets = UUID_GROUPS.map((_, i) => UUID_GROUPS.slice(0, i).reduce((sum, size) => sum + size, 0));
  return UUID_GROUPS.map((size, i) => hex.slice(offsets[i], (offsets[i] ?? 0) + size)).join('-');
};

export const createIds = (clock: Clock): IdGenerator => ({
  next: () => {
    const random = crypto.getRandomValues(new Uint8Array(RANDOM_BYTES));
    const bytes = [...timestampBytes(clock.now().getTime()), ...Array.from(random, shapeRandomByte)];
    return groupUuid(toHex(bytes));
  },
});
