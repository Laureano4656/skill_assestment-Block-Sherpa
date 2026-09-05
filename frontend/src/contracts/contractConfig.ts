import PropertyRegistryABI from './PropertyRegistryABI.json';

export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGON_AMOY_CHAIN_ID_HEX = '0x13882';

export const ANVIL_CHAIN_ID = 31337;
export const ANVIL_CHAIN_ID_HEX = '0x7a69';

export const SUPPORTED_CHAIN_IDS = [POLYGON_AMOY_CHAIN_ID, ANVIL_CHAIN_ID];

export const POLYGON_AMOY_CONFIG = {
  chainId: POLYGON_AMOY_CHAIN_ID_HEX,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrls: [
    'https://polygon-amoy-bor-rpc.publicnode.com',
    'https://polygon-amoy.drpc.org',
    'https://80002.rpc.thirdweb.com',
  ],
  blockExplorerUrls: ['https://amoy.polygonscan.com'],
};

export const ANVIL_CONFIG = {
  chainId: ANVIL_CHAIN_ID_HEX,
  chainName: 'Anvil Localhost',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['http://127.0.0.1:8545'],
  blockExplorerUrls: [],
};

// Contract address on Polygon Amoy (can be overridden by VITE_PROPERTY_REGISTRY_ADDRESS env var)
export const AMOY_PROPERTY_REGISTRY_ADDRESS: string =
  (import.meta as any).env?.VITE_PROPERTY_REGISTRY_ADDRESS ||
  '0x0000000000000000000000000000000000000000';

// Contract address on local Anvil (can be overridden by VITE_ANVIL_REGISTRY_ADDRESS env var)
export const ANVIL_PROPERTY_REGISTRY_ADDRESS: string =
  (import.meta as any).env?.VITE_ANVIL_REGISTRY_ADDRESS ||
  '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export const getContractAddressForChain = (
  chainId: number | null,
  preferredNetwork?: 'amoy' | 'anvil'
): string => {
  if (chainId === ANVIL_CHAIN_ID) {
    return ANVIL_PROPERTY_REGISTRY_ADDRESS;
  }
  if (chainId === POLYGON_AMOY_CHAIN_ID) {
    return AMOY_PROPERTY_REGISTRY_ADDRESS;
  }
  if (preferredNetwork === 'amoy') {
    return AMOY_PROPERTY_REGISTRY_ADDRESS;
  }
  if (preferredNetwork === 'anvil') {
    return ANVIL_PROPERTY_REGISTRY_ADDRESS;
  }
  // If wallet is not connected yet, check if default network is configured as anvil
  const defaultNetwork = (import.meta as any).env?.VITE_DEFAULT_NETWORK;
  if (defaultNetwork === 'anvil') {
    return ANVIL_PROPERTY_REGISTRY_ADDRESS;
  }
  return AMOY_PROPERTY_REGISTRY_ADDRESS;
};

// Default export for backward compatibility
export const PROPERTY_REGISTRY_ADDRESS: string = AMOY_PROPERTY_REGISTRY_ADDRESS;

export { PropertyRegistryABI };
