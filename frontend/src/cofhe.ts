type CofheClientLike = {
  connected: boolean;
  disconnect: () => void;
  connect: (publicClient: unknown, walletClient: unknown) => Promise<void>;
  permits: {
    getOrCreateSelfPermit: () => Promise<unknown>;
  };
  encryptInputs: (...args: unknown[]) => {
    execute: () => Promise<unknown[]>;
  };
  decryptForView: (...args: unknown[]) => {
    withPermit: () => { execute: () => Promise<unknown> };
    execute: () => Promise<unknown>;
  };
  decryptForTx: (...args: unknown[]) => {
    withoutPermit: () => { execute: () => Promise<{ decryptedValue: unknown; signature: `0x${string}` }> };
  };
};

let cofheClient: CofheClientLike | null = null;
let cofheClientPromise: Promise<CofheClientLike> | null = null;

export async function getCofheClient() {
  if (!cofheClientPromise) {
    cofheClientPromise = Promise.all([import('@cofhe/sdk/web'), import('@cofhe/sdk/chains')])
      .then(([{ createCofheConfig, createCofheClient }, { sepolia }]) => {
        const config = createCofheConfig({
          supportedChains: [sepolia],
          /** Avoid Vite/Rollup worker bundle issues in production build */
          useWorkers: false,
        });
        cofheClient = createCofheClient(config) as CofheClientLike;
        return cofheClient;
      })
      .catch((error) => {
        cofheClientPromise = null;
        throw error;
      });
  }

  return cofheClientPromise;
}

export function getLoadedCofheClient() {
  return cofheClient;
}

export function disconnectLoadedCofheClient() {
  cofheClient?.disconnect();
}
