import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@cofhe/hardhat-plugin';
import * as dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.28',
    settings: {
      evmVersion: 'cancun',
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    'eth-sepolia': {
      url: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      accounts: (() => {
        const pk = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
        return pk ? [pk] : [];
      })(),
      chainId: 11155111,
    },
  },
};

export default config;
