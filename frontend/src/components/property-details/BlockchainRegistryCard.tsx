import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  Coins,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePropertyContract,
  OnChainProperty,
} from '../../hooks/usePropertyContract';

interface BlockchainRegistryCardProps {
  propertyId: string; // Mongo / platform property id
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: number;
  initialOnChainId?: number | null;
}

const BlockchainRegistryCard: React.FC<BlockchainRegistryCardProps> = ({
  propertyId,
  propertyTitle,
  propertyLocation,
  propertyPrice,
  initialOnChainId,
}) => {
  const {
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
    registerPropertyOnChain,
    fetchOnChainProperty,
    transferPropertyOwnership,
  } = usePropertyContract();

  // Storage key for mapping local property _id to on-chain propertyId
  const storageKey = `rechain_onchain_id_${propertyId}`;
  const [onChainId, setOnChainId] = useState<number | null>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) return parseInt(saved, 10);
    return initialOnChainId || null;
  });

  // Keep in sync if initialOnChainId is loaded asynchronously
  useEffect(() => {
    if (initialOnChainId && !onChainId) {
      setOnChainId(initialOnChainId);
    }
  }, [initialOnChainId, onChainId]);

  const [onChainData, setOnChainData] = useState<OnChainProperty | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Transfer Ownership Form State
  const [showTransfer, setShowTransfer] = useState<boolean>(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState<string>('');

  // Register price input (default converted to a sensible testnet POL amount e.g. 0.01 or custom)
  const defaultPolPrice = (propertyPrice / 10000000).toFixed(4); // reasonable mock scale or 0.1
  const [registrationPrice, setRegistrationPrice] = useState<string>(
    Number(defaultPolPrice) > 0 ? defaultPolPrice : '0.1'
  );

  // Load on-chain data if onChainId is known
  useEffect(() => {
    if (!onChainId) return;

    let mounted = true;
    setLoadingStatus(true);
    fetchOnChainProperty(onChainId)
      .then((data) => {
        if (mounted && data) {
          setOnChainData(data);
        }
      })
      .finally(() => {
        if (mounted) setLoadingStatus(false);
      });

    return () => {
      mounted = false;
    };
  }, [onChainId, fetchOnChainProperty]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegister = async () => {
    if (!account) {
      await connectWallet();
      return;
    }

    if (!isCorrectNetwork) {
      const switched = await switchToAmoy();
      if (!switched) return;
    }

    try {
      toast.info('Sending registration transaction to Polygon Amoy...');
      const result = await registerPropertyOnChain(
        propertyLocation,
        registrationPrice
      );

      if (result.propertyId) {
        setOnChainId(result.propertyId);
        localStorage.setItem(storageKey, result.propertyId.toString());
        // Fetch newly registered on-chain details
        const details = await fetchOnChainProperty(result.propertyId);
        if (details) setOnChainData(details);
      }

      toast.success('Property registered successfully on Polygon Amoy!');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onChainId || !newOwnerAddress) return;

    try {
      toast.info('Submitting ownership transfer transaction...');
      await transferPropertyOwnership(onChainId, newOwnerAddress.trim());
      toast.success('Ownership transferred successfully!');
      setShowTransfer(false);
      setNewOwnerAddress('');

      // Refresh data
      const updated = await fetchOnChainProperty(onChainId);
      if (updated) setOnChainData(updated);
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed');
    }
  };

  const isOwner =
    account &&
    onChainData?.owner &&
    account.toLowerCase() === onChainData.owner.toLowerCase();

  return (
    <div className="bg-white border border-[#E6E0DA] rounded-2xl p-6 shadow-sm mt-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0EBE6] pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#8247E5]/10 flex items-center justify-center text-[#8247E5]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-manrope font-bold text-[#1a1a2e] text-base leading-tight">
              Blockchain Registry
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              Polygon Amoy Testnet (80002)
            </span>
          </div>
        </div>

        {/* Network / Status Badge */}
        <div>
          {onChainData?.exists ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified On-Chain
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Not Registered
            </span>
          )}
        </div>
      </div>

      {/* Wallet Connection Status Bar */}
      <div className="mb-4 bg-[#F8F9FA] rounded-xl p-3 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-600">
          <Wallet className="w-4 h-4 text-gray-500" />
          {account ? (
            <span>
              Connected:{' '}
              <span className="font-mono text-gray-800 font-medium">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </span>
          ) : (
            <span>No Web3 wallet connected</span>
          )}
        </div>

        {!account ? (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="text-xs font-semibold text-[#8247E5] hover:text-[#6a34c9] transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : !isCorrectNetwork ? (
          <button
            onClick={switchToAmoy}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline"
          >
            Switch to Amoy
          </button>
        ) : (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Amoy Active
          </span>
        )}
      </div>

      {/* Body Content */}
      {loadingStatus ? (
        <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#8247E5]" />
          <p className="text-xs">Fetching on-chain property data...</p>
        </div>
      ) : onChainData?.exists ? (
        /* Verified On-Chain Details */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EFECE8]">
              <span className="text-gray-500 block mb-1">On-Chain ID</span>
              <span className="font-mono font-bold text-gray-800 text-sm">
                #{onChainData.id}
              </span>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EFECE8]">
              <span className="text-gray-500 block mb-1">Registered Price</span>
              <span className="font-bold text-[#D4755B] text-sm flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                {onChainData.price} POL
              </span>
            </div>
          </div>

          <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EFECE8] text-xs">
            <span className="text-gray-500 block mb-1">Owner Address</span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-gray-800 break-all">
                {onChainData.owner}
              </span>
              <button
                onClick={() => handleCopy(onChainData.owner)}
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                title="Copy Address"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Owner Transfer Option */}
          {isOwner && (
            <div className="pt-2 border-t border-[#F0EBE6]">
              {!showTransfer ? (
                <button
                  onClick={() => setShowTransfer(true)}
                  className="w-full text-xs font-semibold text-[#8247E5] border border-[#8247E5]/30 rounded-xl py-2 hover:bg-[#8247E5]/5 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Transfer Ownership to Another Address
                </button>
              ) : (
                <form onSubmit={handleTransfer} className="space-y-3 mt-2">
                  <div className="text-xs">
                    <label className="block text-gray-600 font-medium mb-1">
                      Recipient Address (0x...)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0x..."
                      value={newOwnerAddress}
                      onChange={(e) => setNewOwnerAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#8247E5]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isTransacting}
                      className="flex-1 bg-[#8247E5] hover:bg-[#6a34c9] text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      {isTransacting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Confirm Transfer'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTransfer(false)}
                      className="px-3 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Not Registered: Registration Action */
        <div className="space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Record this property on the Polygon Amoy testnet smart contract to
            establish transparent provenance and tamper-proof ownership.
          </p>

          <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EFECE8] space-y-2 text-xs">
            <div className="flex justify-between items-center text-gray-500">
              <span>Location:</span>
              <span className="font-medium text-gray-800 truncate max-w-[180px]">
                {propertyLocation}
              </span>
            </div>

            <div className="flex justify-between items-center text-gray-500">
              <span>Listing Price:</span>
              <span className="font-bold text-gray-800">
                ${propertyPrice.toLocaleString()}
              </span>
            </div>

            <div className="pt-2 border-t border-[#EFECE8] flex items-center justify-between">
              <label htmlFor="polPrice" className="text-gray-600 font-medium">
                On-Chain Price (POL):
              </label>
              <input
                id="polPrice"
                type="number"
                step="0.001"
                min="0.0001"
                value={registrationPrice}
                onChange={(e) => setRegistrationPrice(e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-right font-mono text-xs focus:outline-none focus:border-[#8247E5]"
              />
            </div>
          </div>

          <button
            onClick={handleRegister}
            disabled={isTransacting || isConnecting}
            className="w-full bg-[#8247E5] hover:bg-[#6a34c9] text-white font-manrope font-bold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {isTransacting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering on Blockchain...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Register on Blockchain
              </>
            )}
          </button>
        </div>
      )}

      {/* Transaction Feedback */}
      {txHash && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Transaction Completed
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span className="font-mono truncate max-w-[200px]">
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </span>
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#8247E5] hover:underline font-semibold"
            >
              View on Amoy Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {/* Contract reference footer */}
      {contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000' && (
        <div className="mt-4 pt-3 border-t border-[#F0EBE6] text-[11px] text-gray-400 flex items-center justify-between">
          <span>Contract: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}</span>
          <a
            href={`https://amoy.polygonscan.com/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600 transition-colors inline-flex items-center gap-0.5"
          >
            PolygonScan <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  );
};

export default BlockchainRegistryCard;
