import { createCofheConfig, createCofheClient } from '@cofhe/sdk/web';
import { sepolia as cofheSepolia } from '@cofhe/sdk/chains';

export const cofheConfig = createCofheConfig({
  supportedChains: [cofheSepolia],
  /** Avoid Vite/Rollup worker bundle issues in production build */
  useWorkers: false,
});

export const cofheClient = createCofheClient(cofheConfig);
