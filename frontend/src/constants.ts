import { isAddress } from 'viem/utils';

const raw = import.meta.env.VITE_FHEPAY_ADDRESS as string | undefined;
type Address = `0x${string}`;

export function getFhePayAddress(): Address | undefined {
  if (!raw || !isAddress(raw)) return undefined;
  return raw as Address;
}
