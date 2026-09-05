import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  POLYGON_AMOY_CHAIN_ID,
  POLYGON_AMOY_CONFIG,
  ANVIL_CHAIN_ID,
  ANVIL_CONFIG,
  SUPPORTED_CHAIN_IDS,
  getContractAddressForChain,
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
  switchToAnvil: () => Promise<boolean>;
  registerPropertyOnChain: (
    propertyLocation: string,
    priceInUSD: number | string
  ) => Promise<{ txHash: string; propertyId?: number }>;
  fetchOnChainProperty: (
    propertyId: number,
    targetNetworkChainId?: number | null
  ) => Promise<OnChainProperty | null>;
  transferPropertyOwnership: (
    propertyId: number,
    newOwner: string
  ) => Promise<{ txHash: string }>;
  transferPropertyOwnershipWithPermit: (
    propertyId: number,
    newOwner: string,
    deadline: number,
    signature: string
  ) => Promise<{ txHash: string }>;
  signTransferAcceptance: (
    propertyId: number,
    currentOwner: string,
    deadlineSeconds?: number
  ) => Promise<{
    signature: string;
    deadline: number;
    nonce: number;
    newOwner: string;
  }>;
  fetchNonce: (address: string) => Promise<number>;
  clearStatus: () => void;
}

const propertyInterface = new ethers.Interface(PropertyRegistryABI);

export const parseRegistryContractError = (err: any): string => {
  try {
    const errorData =
      err?.data ||
      err?.error?.data ||
      err?.info?.error?.data ||
      err?.revert?.data ||
      (typeof err?.message === 'string' && err.message.includes('data="0x')
        ? err.message.match(/data="(0x[a-fA-F0-9]+)"/)?.[1]
        : null);

    if (errorData && typeof errorData === 'string' && errorData.startsWith('0x')) {
      if (errorData.startsWith('0x8baa579f')) {
        return 'Invalid EIP-712 signature. The signed deadline, buyer address, or nonce does not match.';
      }
      const parsed = propertyInterface.parseError(errorData);
      if (parsed) {
        switch (parsed.name) {
          case 'InvalidSignature':
            return 'Invalid EIP-712 signature. The signed deadline, buyer address, or nonce does not match.';
          case 'PermitExpired':
            return 'The EIP-712 buyer permit has expired. Please request a newly signed permit.';
          case 'NotPropertyOwner':
            return 'Only the current registered on-chain owner can execute property transfers.';
          case 'SameOwner':
            return 'The specified recipient is already the current owner of this property.';
          case 'InvalidNewOwner':
            return 'Invalid recipient address (zero address).';
          case 'PropertyNotFound':
            return 'Property does not exist on-chain.';
          case 'EmptyPropertyAddress':
            return 'Property location address cannot be empty.';
          case 'InvalidPrice':
            return 'Property price must be greater than zero.';
          default:
            return `Transaction reverted: ${parsed.name}`;
        }
      }
    }
  } catch {
    // Parsing custom error data failed, proceed to fallback
  }

  if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
    return 'Transaction was cancelled in MetaMask.';
  }

  return err?.reason || err?.shortMessage || err?.message || 'Transaction failed';
};

export const usePropertyContract = (): UsePropertyContractReturn => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCorrectNetwork = chainId ? SUPPORTED_CHAIN_IDS.includes(chainId) : false;
  const contractAddress = getContractAddressForChain(chainId);

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

  const switchToAnvil = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask not detected');
      return false;
    }

    const ethereum = (window as any).ethereum;
    try {
      setError(null);
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ANVIL_CONFIG.chainId }],
      });
      setChainId(ANVIL_CHAIN_ID);
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [ANVIL_CONFIG],
          });
          setChainId(ANVIL_CHAIN_ID);
          return true;
        } catch (addError: any) {
          console.error('Failed to add Anvil network:', addError);
          setError(addError?.message || 'Failed to add Anvil Localhost network');
          return false;
        }
      }
      console.error('Failed to switch network:', switchError);
      setError(switchError?.message || 'Failed to switch to Anvil');
      return false;
    }
  }, []);

  const registerPropertyOnChain = useCallback(
    async (
      propertyLocation: string,
      priceInUSD: number | string
    ): Promise<{ txHash: string; propertyId?: number }> => {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('Please install MetaMask to interact with the blockchain.');
      }

      if (!contractAddress || contractAddress === ethers.ZeroAddress) {
        throw new Error(
          'PropertyRegistry contract address is not configured for this network.'
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
        const currentNetworkChainId = Number(network.chainId);
        if (!SUPPORTED_CHAIN_IDS.includes(currentNetworkChainId)) {
          const switched = await switchToAmoy();
          if (!switched) {
            throw new Error('Please switch to a supported network (Polygon Amoy or Anvil Localhost).');
          }
        }

        const contract = new ethers.Contract(
          contractAddress,
          PropertyRegistryABI,
          signer
        );

        // Convert price to 18-decimal base units (USD / USDT standard)
        const priceString = priceInUSD.toString();
        const priceWei = ethers.parseEther(priceString);
        const txOverrides = getTxOverrides(currentNetworkChainId);
        const tx = await contract.registerProperty(propertyLocation, priceWei, txOverrides);
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
        const errMsg = parseRegistryContractError(err);
        setError(errMsg);
        throw new Error(errMsg);
      } finally {
        setIsTransacting(false);
      }
    },
    [contractAddress, switchToAmoy]
  );

  const fetchOnChainProperty = useCallback(
    async (
      propertyId: number,
      targetNetworkChainId?: number | null
    ): Promise<OnChainProperty | null> => {
      if (typeof window === 'undefined') {
        return null;
      }

      const activeChainId = targetNetworkChainId !== undefined && targetNetworkChainId !== null
        ? targetNetworkChainId
        : chainId;

      const isTargetAnvil =
        activeChainId === ANVIL_CHAIN_ID ||
        (!activeChainId && (import.meta as any).env?.VITE_DEFAULT_NETWORK === 'anvil');

      const activeContractAddress = getContractAddressForChain(
        activeChainId,
        isTargetAnvil ? 'anvil' : 'amoy'
      );

      if (
        !activeContractAddress ||
        activeContractAddress === ethers.ZeroAddress ||
        !ethers.isAddress(activeContractAddress)
      ) {
        return null;
      }

      // 1. If user's wallet is already connected and on a matching supported network, query through BrowserProvider
      const ethereum = (window as any).ethereum;
      if (
        ethereum &&
        chainId &&
        (!targetNetworkChainId || targetNetworkChainId === chainId) &&
        SUPPORTED_CHAIN_IDS.includes(chainId)
      ) {
        try {
          const browserProvider = new ethers.BrowserProvider(ethereum);
          const code = await browserProvider.getCode(activeContractAddress);
          if (code && code !== '0x') {
            const contract = new ethers.Contract(
              activeContractAddress,
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
          // Fall through to public / local RPCs
        }
      }

      // 2. Determine RPC list depending on active chain
      const rpcList = isTargetAnvil
        ? ANVIL_CONFIG.rpcUrls
        : POLYGON_AMOY_CONFIG.rpcUrls;
      const targetChainId = isTargetAnvil ? ANVIL_CHAIN_ID : POLYGON_AMOY_CHAIN_ID;
      const targetChainName = isTargetAnvil ? 'anvil' : 'amoy';

      for (const rpcUrl of rpcList) {
        try {
          const provider = new ethers.JsonRpcProvider(
            rpcUrl,
            { chainId: targetChainId, name: targetChainName },
            { staticNetwork: true }
          );

          // Check if bytecode exists at this address
          const code = await provider.getCode(activeContractAddress);
          if (!code || code === '0x') {
            continue;
          }

          const contract = new ethers.Contract(
            activeContractAddress,
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
        const network = await provider.getNetwork();
        const currentNetworkChainId = Number(network.chainId);
        const txOverrides = getTxOverrides(currentNetworkChainId);
        const contract = new ethers.Contract(
          contractAddress,
          PropertyRegistryABI,
          signer
        );

        const tx = await contract.transferOwnership(propertyId, newOwner, txOverrides);
        setTxHash(tx.hash);
        await tx.wait();

        return { txHash: tx.hash };
      } catch (err: any) {
        console.error('Ownership transfer failed:', err);
        const errMsg = parseRegistryContractError(err);
        setError(errMsg);
        throw new Error(errMsg);
      } finally {
        setIsTransacting(false);
      }
    },
    [contractAddress]
  );

  const fetchNonce = useCallback(async (ownerAddress: string): Promise<number> => {
    if (!ethers.isAddress(ownerAddress)) return 0;
    try {
      let provider: ethers.Provider | null = null;
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        provider = new ethers.BrowserProvider((window as any).ethereum);
      } else {
        const rpcUrl = chainId === ANVIL_CHAIN_ID ? ANVIL_CONFIG.rpcUrls[0] : POLYGON_AMOY_CONFIG.rpcUrls[0];
        provider = new ethers.JsonRpcProvider(rpcUrl);
      }
      const contract = new ethers.Contract(
        contractAddress,
        PropertyRegistryABI,
        provider
      );
      const nonce = await contract.nonces(ownerAddress);
      return Number(nonce);
    } catch (e) {
      console.error('Failed to fetch nonce:', e);
      return 0;
    }
  }, [chainId, contractAddress]);

  const signTransferAcceptance = useCallback(
    async (
      propertyId: number,
      currentOwner: string,
      deadlineSeconds: number = 86400
    ): Promise<{
      signature: string;
      deadline: number;
      nonce: number;
      newOwner: string;
    }> => {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('Please install MetaMask to sign deed acceptance.');
      }
      if (!account) {
        throw new Error('Wallet not connected. Please connect your wallet.');
      }

      setIsTransacting(true);
      setError(null);

      try {
        const ethereum = (window as any).ethereum;
        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();

        const contract = new ethers.Contract(
          contractAddress,
          PropertyRegistryABI,
          signer
        );

        const currentNonce = Number(await contract.nonces(signerAddress));
        const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;

        const activeChainId = chainId || Number((await provider.getNetwork()).chainId);

        const domain = {
          name: 'REChain Property Registry',
          version: '1',
          chainId: activeChainId,
          verifyingContract: contractAddress,
        };

        const types = {
          AcceptTransfer: [
            { name: 'propertyId', type: 'uint256' },
            { name: 'currentOwner', type: 'address' },
            { name: 'newOwner', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        };

        const value = {
          propertyId,
          currentOwner,
          newOwner: signerAddress,
          nonce: currentNonce,
          deadline,
        };

        const signature = await signer.signTypedData(domain, types, value);

        return {
          signature,
          deadline,
          nonce: currentNonce,
          newOwner: signerAddress,
        };
      } catch (err: any) {
        console.error('Signing permit failed:', err);
        const errMsg = parseRegistryContractError(err);
        setError(errMsg);
        throw new Error(errMsg);
      } finally {
        setIsTransacting(false);
      }
    },
    [account, chainId, contractAddress]
  );
  // Helper to apply Polygon Amoy specific gas requirements
  const getTxOverrides = (currentChainId: number) => {
    if (currentChainId === POLYGON_AMOY_CHAIN_ID) {
      return {
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('35', 'gwei'),
      };
    }
    return {};
  };
  const transferPropertyOwnershipWithPermit = useCallback(
    async (
      propertyId: number,
      newOwner: string,
      deadline: number,
      signature: string
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

        const network = await provider.getNetwork();
        const currentNetworkChainId = Number(network.chainId);
        const txOverrides = getTxOverrides(currentNetworkChainId);

        const contract = new ethers.Contract(
          contractAddress,
          PropertyRegistryABI,
          signer
        );

        // Pass txOverrides as the final argument
        const tx = await contract.transferOwnershipWithPermit(
          propertyId,
          newOwner,
          deadline,
          signature,
          txOverrides
        );
        setTxHash(tx.hash);
        await tx.wait();

        return { txHash: tx.hash };
      } catch (err: any) {
        console.error('Permit ownership transfer failed:', err);
        const errMsg = parseRegistryContractError(err);
        setError(errMsg);
        throw new Error(errMsg);
      } finally {
        setIsTransacting(false);
      }
    },
    [contractAddress]
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
    contractAddress,
    connectWallet,
    switchToAmoy,
    switchToAnvil,
    registerPropertyOnChain,
    fetchOnChainProperty,
    transferPropertyOwnership,
    transferPropertyOwnershipWithPermit,
    signTransferAcceptance,
    fetchNonce,
    clearStatus,
  };
};
