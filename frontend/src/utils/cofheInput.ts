import type { EncryptedItemInput } from '@cofhe/sdk';

export function toEncryptedItemInput(input: unknown): EncryptedItemInput<`0x${string}`> {
  const item = input as Partial<EncryptedItemInput>;
  if (
    typeof item.ctHash !== 'bigint' ||
    typeof item.securityZone !== 'number' ||
    typeof item.signature !== 'string' ||
    !item.signature.startsWith('0x')
  ) {
    throw new Error('CoFHE encryption returned an invalid encrypted input.');
  }

  return item as EncryptedItemInput<`0x${string}`>;
}
