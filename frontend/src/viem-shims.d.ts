declare module 'viem/chains' {
  import type { Chain } from 'viem';

  export const sepolia: Chain;
}

declare module 'viem/utils' {
  export function isAddress(value: string): value is `0x${string}`;
}
