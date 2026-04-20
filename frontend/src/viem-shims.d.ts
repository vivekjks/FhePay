declare module 'viem/chains' {
  export const sepolia: {
    id: number;
    name: string;
  };
}

declare module 'viem/utils' {
  export function isAddress(value: string): value is `0x${string}`;
}
