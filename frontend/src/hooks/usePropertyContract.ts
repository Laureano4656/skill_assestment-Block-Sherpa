import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  POLYGON_AMOY_CHAIN_ID,
  POLYGON_AMOY_CONFIG,
  PROPERTY_REGISTRY_ADDRESS,
  PropertyRegistryABI,
} from '../contracts/contractConfig';

export interface OnChainProperty {
  id: number;
  propertyAddress: string;
  owner: string;
  price: string;
  registeredTimestamp: number;
  exists: boolean;
}

export interface UsePropertyContractReturn {
  account: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  isTransacting: boolean;
  txHash: string | null;
  error: string | null;
  contractAddress: string;
  connectWallet: () => Promise<string | null>;
  switchToAmoy: () => Promise<boolean>;
  registerPropertyOnChain: (
    propertyLocation: string,
    priceInPOL: number | string
  ) => Promise<{ txHash: string; propertyId?: number }>;
  fetchOnChainProperty: (propertyId: number) => Promise<OnChainProperty | null>;
  transferPropertyOwnership: (
    propertyId: number,
    newOwner: string
  ) => Promise<{ txHash: string }>;
  clearStatus: () => void;
}

export const usePropertyContract = (): UsePropertyContractReturn => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCorrectNetwork = chainId === POLYGON_AMOY_CHAIN_ID;

  // Initialize and listen to wallet changes
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      return;
    }

    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        setAccount(null);
      }
    };

    const handleChainChanged = (hexChainId: string) => {
      setChainId(parseInt(hexChainId, 16));
    };

    // Read current state
    ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts.length > 0) setAccount(accounts[0]);
      })
      .catch((err: any) => console.error('Error fetching accounts:', err));

    ethereum
      .request({ method: 'eth_chainId' })
      .then((hexChainId: string) => {
        setChainId(parseInt(hexChainId, 16));
      })
      .catch((err: any) => console.error('Error fetching chainId:', err));

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const connectWallet = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('No Ethereum wallet found. Please install MetaMask.');
      return null;
    }

    try {
      setIsConnecting(true);
      setError(null);
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });
      const currentAccount = accounts[0] || null;
      setAccount(currentAccount);

      const hexChainId = await ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(hexChainId, 16);
      setChainId(currentChainId);

      return currentAccount;
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setError(err?.message || 'Failed to connect wallet');
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const switchToAmoy = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask not detected');
      return false;
    }

    const ethereum = (window as any).ethereum;
    try {
      setError(null);
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY_CONFIG.chainId }],
      });
      setChainId(POLYGON_AMOY_CHAIN_ID);
      return true;
    } catch (switchError: any) {
      // Error code 4902 means the chain hasn't been added yet
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [POLYGON_AMOY_CONFIG],
          });
          setChainId(POLYGON_AMOY_CHAIN_ID);
          return true;
        } catch (addError: any) {
          console.error('Failed to add Polygon Amoy network:', addError);
          setError(addError?.message || 'Failed to add Polygon Amoy');
          return false;
        }
      }
      console.error('Failed to switch network:', switchError);
      setError(switchError?.message || 'Failed to switch network');
      return false;
    }
  }, []);

  const registerPropertyOnChain = useCallback(
    async (
      propertyLocation: string,
      priceInPOL: number | string
    ): Promise<{ txHash: string; propertyId?: number }> => {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('Please install MetaMask to interact with the blockchain.');
      }

      if (!PROPERTY_REGISTRY_ADDRESS || PROPERTY_REGISTRY_ADDRESS === ethers.ZeroAddress) {
        throw new Error(
          'PropertyRegistry contract address is not configured. Deploy the contract and set VITE_PROPERTY_REGISTRY_ADDRESS.'
        );
      }

      setIsTransacting(true);
      setError(null);
      setTxHash(null);

      try {
        const ethereum = (window as any).ethereum;
        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();

        // Ensure correct network
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== POLYGON_AMOY_CHAIN_ID) {
          const switched = await switchToAmoy();
          if (!switched) {
            throw new Error('Please switch to Polygon Amoy Testnet to continue.');
          }
        }

        const contract = new ethers.Contract(
          PROPERTY_REGISTRY_ADDRESS,
          PropertyRegistryABI,
          signer
        );

        // Convert price to wei (assuming price is formatted in POL / ether units)
        const priceString = priceInPOL.toString();
        const priceWei = ethers.parseEther(priceString);

        const tx = await contract.registerProperty(propertyLocation, priceWei);
        setTxHash(tx.hash);

        // Wait for confirmation
        const receipt = await tx.wait();

        // Parse PropertyRegistered event to get propertyId
        let registeredId: number | undefined;
        if (receipt && receipt.logs) {
          for (const log of receipt.logs) {
            try {
              const parsed = contract.interface.parseLog({
                topics: [...log.topics],
                data: log.data,
              });
              if (parsed && parsed.name === 'PropertyRegistered') {
                registeredId = Number(parsed.args[0]);
                break;
              }
            } catch {
              // Ignore logs from other contracts/events
            }
          }
        }

        return { txHash: tx.hash, propertyId: registeredId };
      } catch (err: any) {
        console.error('Registration failed:', err);
        const errMsg = err?.reason || err?.message || 'Transaction failed';
        setError(errMsg);
        throw new Error(errMsg);
      } finally {
        setIsTransacting(false);
      }
    },
    [switchToAmoy]
  );

  const fetchOnChainProperty = useCallback(
    async (propertyId: number): Promise<OnChainProperty | null> => {
      if (typeof window === 'undefined') {
        return null;
      }

      if (
        !PROPERTY_REGISTRY_ADDRESS ||
        PROPERTY_REGISTRY_ADDRESS === ethers.ZeroAddress ||
        !ethers.isAddress(PROPERTY_REGISTRY_ADDRESS)
      ) {
        return null;
      }

      // 1. If user's wallet is already connected and on Polygon Amoy, query through BrowserProvider
      const ethereum = (window as any).ethereum;
      if (ethereum && chainId === POLYGON_AMOY_CHAIN_ID) {
        try {
          const browserProvider = new ethers.BrowserProvider(ethereum);
          const code = await browserProvider.getCode(PROPERTY_REGISTRY_ADDRESS);
          if (code && code !== '0x') {
            const contract = new ethers.Contract(
              PROPERTY_REGISTRY_ADDRESS,
              PropertyRegistryABI,
              browserProvider
            );
            const isRegistered = await contract.isPropertyRegistered(propertyId);
            if (isRegistered) {
              const prop = await contract.getProperty(propertyId);
              return {
                id: Number(prop.id),
                propertyAddress: prop.propertyAddress,
                owner: prop.owner,
                price: ethers.formatEther(prop.price),
                registeredTimestamp: Number(prop.registeredTimestamp),
                exists: prop.exists,
              };
            }
          }
        } catch {
          // Fall through to public RPCs
        }
      }

      // 2. Iterate through robust public RPC URLs with staticNetwork config
      for (const rpcUrl of POLYGON_AMOY_CONFIG.rpcUrls) {
        try {
          const provider = new ethers.JsonRpcProvider(
            rpcUrl,
            { chainId: POLYGON_AMOY_CHAIN_ID, name: 'amoy' },
            { staticNetwork: true }
          );

          // Check if bytecode exists at this address
          const code = await provider.getCode(PROPERTY_REGISTRY_ADDRESS);
          if (!code || code === '0x') {
            // No contract deployed at this address on this network yet
            return null;
          }

          const contract = new ethers.Contract(
            PROPERTY_REGISTRY_ADDRESS,
            PropertyRegistryABI,
            provider
          );

          const isRegistered = await contract.isPropertyRegistered(propertyId);
          if (!isRegistered) return null;

          const prop = await contract.getProperty(propertyId);
          return {
            id: Number(prop.id),
            propertyAddress: prop.propertyAddress,
            owner: prop.owner,
            price: ethers.formatEther(prop.price),
            registeredTimestamp: Number(prop.registeredTimestamp),
            exists: prop.exists,
          };
        } catch {
          // Continue to next fallback RPC endpoint
          continue;
        }
      }

      return null;
    },
    [chainId]
  );

  const transferPropertyOwnership = useCallback(
    async (
      propertyId: number,
      newOwner: string
    ): Promise<{ txHash: string }> => {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('Please install MetaMask to interact with the blockchain.');
      }

      if (!ethers.isAddress(newOwner)) {
        throw new Error('Invalid recipient Ethereum address.');
      }

      setIsTransacting(true);
      setError(null);

      try {
        const ethereum = (window as any).ethereum;
        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();

        const contract = new ethers.Contract(
          PROPERTY_REGISTRY_ADDRESS,
          PropertyRegistryABI,
          signer
        );

        const tx = await contract.transferOwnership(propertyId, newOwner);
        setTxHash(tx.hash);
        await tx.wait();

        return { txHash: tx.hash };
      } catch (err: any) {
        console.error('Ownership transfer failed:', err);
        const errMsg = err?.reason || err?.message || 'Transfer transaction failed';
        setError(errMsg);
        throw new Error(errMsg);
      } finally {
        setIsTransacting(false);
      }
    },
    []
  );

  const clearStatus = useCallback(() => {
    setTxHash(null);
    setError(null);
  }, []);

  return {
    account,
    chainId,
    isCorrectNetwork,
    isConnecting,
    isTransacting,
    txHash,
    error,
    contractAddress: PROPERTY_REGISTRY_ADDRESS,
    connectWallet,
    switchToAmoy,
    registerPropertyOnChain,
    fetchOnChainProperty,
    transferPropertyOwnership,
    clearStatus,
  };
};
