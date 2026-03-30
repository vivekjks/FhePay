/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FHEPAY_ADDRESS?: string;
  readonly VITE_SEPOLIA_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
