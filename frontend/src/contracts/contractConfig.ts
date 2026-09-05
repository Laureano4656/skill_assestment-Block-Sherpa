import PropertyRegistryABI from './PropertyRegistryABI.json';

export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGON_AMOY_CHAIN_ID_HEX = '0x13882';

export const POLYGON_AMOY_CONFIG = {
  chainId: POLYGON_AMOY_CHAIN_ID_HEX,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrls: [
    'https://polygon-amoy.drpc.org',
    'https://polygon-amoy-bor-rpc.publicnode.com',
    'https://80002.rpc.thirdweb.com',
  ],
  blockExplorerUrls: ['https://amoy.polygonscan.com'],
};

// Contract address on Polygon Amoy (can be overridden by VITE_PROPERTY_REGISTRY_ADDRESS env var)
export const PROPERTY_REGISTRY_ADDRESS: string =
  (import.meta as any).env?.VITE_PROPERTY_REGISTRY_ADDRESS ||
  '0x0000000000000000000000000000000000000000';

export { PropertyRegistryABI };
