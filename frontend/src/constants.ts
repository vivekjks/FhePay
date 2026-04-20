const raw = import.meta.env.VITE_FHEPAY_ADDRESS as string | undefined;
type Address = `0x${string}`;

export function getFhePayAddress(): Address | undefined {
  if (!raw || !raw.startsWith('0x') || raw.length !== 42) return undefined;
  return raw as Address;
}
