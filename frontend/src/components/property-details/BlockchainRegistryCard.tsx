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
  Crown,
  Sparkles,
  Handshake,
  FileSignature,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePropertyContract,
  OnChainProperty,
} from '../../hooks/usePropertyContract';
import { getContractAddressForChain } from '../../contracts/contractConfig';

export interface BuyerPermitPackage {
  propertyId: number;
  buyer: string;
  deadline: number;
  expiresAt: string;
  signature: string;
}

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
    switchToAnvil,
    registerPropertyOnChain,
    fetchOnChainProperty,
    transferPropertyOwnership,
    transferPropertyOwnershipWithPermit,
    signTransferAcceptance,
  } = usePropertyContract();

  // Network selection state: default to 'amoy' to ensure initial render never pings offline Anvil
  const [selectedNetwork, setSelectedNetwork] = useState<'anvil' | 'amoy'>(() => {
    if (chainId === 31337) return 'anvil';
    if (chainId === 80002) return 'amoy';
    const saved = localStorage.getItem('rechain_preferred_network');
    if (saved === 'amoy' || saved === 'anvil') return saved;
    return 'amoy';
  });

  // Sync selected network when wallet network changes
  useEffect(() => {
    if (chainId === 31337) {
      setSelectedNetwork('anvil');
      localStorage.setItem('rechain_preferred_network', 'anvil');
    } else if (chainId === 80002) {
      setSelectedNetwork('amoy');
      localStorage.setItem('rechain_preferred_network', 'amoy');
    }
  }, [chainId]);

  const isAnvil = selectedNetwork === 'anvil';
  const targetChainId = isAnvil ? 31337 : 80002;
  const networkLabel = isAnvil
    ? 'Anvil Localhost (31337)'
    : 'Polygon Amoy (80002)';

  // Resolve contract address for the currently selected network
  const displayContractAddress = getContractAddressForChain(targetChainId, selectedNetwork);

  // Storage key for mapping local property _id to on-chain propertyId
  const storageKey = `rechain_onchain_id_${targetChainId}_${propertyId}`;

  const [onChainId, setOnChainId] = useState<number | null>(() => {
    const scoped = localStorage.getItem(`rechain_onchain_id_${targetChainId}_${propertyId}`);
    if (scoped) return parseInt(scoped, 10);
    if (targetChainId === 80002) {
      const legacy = localStorage.getItem(`rechain_onchain_id_${propertyId}`);
      if (legacy) return parseInt(legacy, 10);
    }
    return initialOnChainId || null;
  });

  // Sync onChainId when targetChainId or propertyId changes
  useEffect(() => {
    const scoped = localStorage.getItem(`rechain_onchain_id_${targetChainId}_${propertyId}`);
    if (scoped) {
      setOnChainId(parseInt(scoped, 10));
      return;
    }
    if (targetChainId === 80002) {
      const legacy = localStorage.getItem(`rechain_onchain_id_${propertyId}`);
      if (legacy) {
        setOnChainId(parseInt(legacy, 10));
        return;
      }
    }
    setOnChainId(initialOnChainId || null);
  }, [targetChainId, propertyId, initialOnChainId]);

  const [onChainData, setOnChainData] = useState<OnChainProperty | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Reset on-chain data immediately when active chain or propertyId changes to prevent stale data
  useEffect(() => {
    setOnChainData(null);
  }, [targetChainId, propertyId]);

  // Transfer Ownership Form State
  const [showTransfer, setShowTransfer] = useState<boolean>(false);
  const [transferMode, setTransferMode] = useState<'direct' | 'permit'>('direct');
  const [newOwnerAddress, setNewOwnerAddress] = useState<string>('');
  const [permitSignature, setPermitSignature] = useState<string>('');
  const [permitDeadline, setPermitDeadline] = useState<number | null>(null);
  const [permitHours, setPermitHours] = useState<string>('24');
  const [detectedPermit, setDetectedPermit] = useState<BuyerPermitPackage | null>(null);

  // Buyer Permit Generation State (for prospective buyers)
  const [showBuyerSignModal, setShowBuyerSignModal] = useState<boolean>(false);
  const [generatedSignature, setGeneratedSignature] = useState<string | null>(null);
  const [generatedPermit, setGeneratedPermit] = useState<BuyerPermitPackage | null>(null);
  const [copiedSignature, setCopiedSignature] = useState<boolean>(false);
  const [copiedPackage, setCopiedPackage] = useState<boolean>(false);

  // Register price input (denominated in USD / USDT matching listing price)
  const defaultUsdPrice = propertyPrice > 0 ? propertyPrice.toString() : '1000000';
  const [registrationPrice, setRegistrationPrice] = useState<string>(defaultUsdPrice);

  // Load on-chain data if onChainId is known
  useEffect(() => {
    if (!onChainId) {
      setOnChainData(null);
      return;
    }

    let mounted = true;
    setLoadingStatus(true);
    fetchOnChainProperty(onChainId, targetChainId)
      .then((data) => {
        if (mounted) {
          setOnChainData(data);
        }
      })
      .finally(() => {
        if (mounted) setLoadingStatus(false);
      });

    return () => {
      mounted = false;
    };
  }, [onChainId, targetChainId, fetchOnChainProperty]);

  // Check for cached buyer permit in localStorage
  useEffect(() => {
    if (!onChainId) {
      setDetectedPermit(null);
      return;
    }
    const key = `rechain_permit_${targetChainId}_${onChainId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed: BuyerPermitPackage = JSON.parse(raw);
        if (
          parsed.signature &&
          parsed.deadline &&
          parsed.deadline > Math.floor(Date.now() / 1000)
        ) {
          setDetectedPermit(parsed);
        } else {
          setDetectedPermit(null);
        }
      } catch {
        setDetectedPermit(null);
      }
    } else {
      setDetectedPermit(null);
    }
  }, [targetChainId, onChainId, showTransfer]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectAnvil = async () => {
    setSelectedNetwork('anvil');
    localStorage.setItem('rechain_preferred_network', 'anvil');
    if (account && chainId !== 31337) {
      await switchToAnvil();
    }
  };

  const handleSelectAmoy = async () => {
    setSelectedNetwork('amoy');
    localStorage.setItem('rechain_preferred_network', 'amoy');
    if (account && chainId !== 80002) {
      await switchToAmoy();
    }
  };

  const handleRegister = async () => {
    if (!account) {
      await connectWallet();
      return;
    }

    if (isAnvil && chainId !== 31337) {
      const switched = await switchToAnvil();
      if (!switched) return;
    } else if (!isAnvil && chainId !== 80002) {
      const switched = await switchToAmoy();
      if (!switched) return;
    }

    const targetNetworkName = isAnvil ? 'Anvil Localhost' : 'Polygon Amoy';
    try {
      toast.info(`Sending registration transaction to ${targetNetworkName}...`);
      const result = await registerPropertyOnChain(
        propertyLocation,
        registrationPrice
      );

      if (result.propertyId) {
        setOnChainId(result.propertyId);
        localStorage.setItem(storageKey, result.propertyId.toString());
        if (!isAnvil) {
          localStorage.setItem(`rechain_onchain_id_${propertyId}`, result.propertyId.toString());
        }
        // Fetch newly registered on-chain details
        const details = await fetchOnChainProperty(result.propertyId, targetChainId);
        if (details) setOnChainData(details);
      }

      toast.success(`Property registered successfully on ${targetNetworkName}!`);
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onChainId || !newOwnerAddress) return;

    if (isAnvil && chainId !== 31337) {
      const switched = await switchToAnvil();
      if (!switched) return;
    } else if (!isAnvil && chainId !== 80002) {
      const switched = await switchToAmoy();
      if (!switched) return;
    }

    try {
      if (transferMode === 'direct') {
        toast.info('Submitting direct ownership transfer transaction...');
        await transferPropertyOwnership(onChainId, newOwnerAddress.trim());
        toast.success('Ownership transferred successfully!');
      } else {
        if (!permitSignature.trim()) {
          toast.error("Please provide the buyer's signed EIP-712 acceptance permit.");
          return;
        }

        // Use exact permit deadline if available, otherwise calculate from permitHours
        const hours = Number(permitHours) || 24;
        const deadline = permitDeadline || (Math.floor(Date.now() / 1000) + hours * 3600);

        if (deadline <= Math.floor(Date.now() / 1000)) {
          toast.error('The permit deadline has already expired. Please request a newly signed permit.');
          return;
        }

        toast.info('Submitting mutual-consent transfer with verified permit...');
        await transferPropertyOwnershipWithPermit(
          onChainId,
          newOwnerAddress.trim(),
          deadline,
          permitSignature.trim()
        );
        toast.success('Ownership transferred with verified mutual consent!');

        // Clear used permit from storage
        localStorage.removeItem(`rechain_permit_${targetChainId}_${onChainId}`);
        setDetectedPermit(null);
      }

      setShowTransfer(false);
      setNewOwnerAddress('');
      setPermitSignature('');
      setPermitDeadline(null);

      // Refresh data
      const updated = await fetchOnChainProperty(onChainId, targetChainId);
      if (updated) setOnChainData(updated);
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed');
    }
  };

  const handleGenerateBuyerAcceptance = async () => {
    if (!onChainId || !onChainData?.owner) return;
    if (!account) {
      await connectWallet();
      return;
    }

    if (isAnvil && chainId !== 31337) {
      const switched = await switchToAnvil();
      if (!switched) return;
    } else if (!isAnvil && chainId !== 80002) {
      const switched = await switchToAmoy();
      if (!switched) return;
    }

    try {
      toast.info('Requesting EIP-712 signature in wallet (0 gas)...');
      const hours = Number(permitHours) || 24;
      const result = await signTransferAcceptance(
        onChainId,
        onChainData.owner,
        hours * 3600
      );

      const permitPackage: BuyerPermitPackage = {
        propertyId: onChainId,
        buyer: result.newOwner,
        deadline: result.deadline,
        expiresAt: new Date(result.deadline * 1000).toLocaleString(),
        signature: result.signature,
      };

      setGeneratedSignature(result.signature);
      setGeneratedPermit(permitPackage);

      // Cache locally for seamless dev/testing switching
      const key = `rechain_permit_${targetChainId}_${onChainId}`;
      localStorage.setItem(key, JSON.stringify(permitPackage));
      setDetectedPermit(permitPackage);

      toast.success('Acceptance deed signed for free (0 gas)!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign acceptance deed');
    }
  };

  const handleCopySignature = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSignature(true);
    toast.success('Raw signature copied to clipboard!');
    setTimeout(() => setCopiedSignature(false), 2500);
  };

  const handleCopyPackage = (pkg: BuyerPermitPackage) => {
    navigator.clipboard.writeText(JSON.stringify(pkg, null, 2));
    setCopiedPackage(true);
    toast.success('Permit package copied to clipboard!');
    setTimeout(() => setCopiedPackage(false), 2500);
  };

  const handleApplyDetectedPermit = () => {
    if (!detectedPermit) return;
    setNewOwnerAddress(detectedPermit.buyer);
    setPermitSignature(detectedPermit.signature);
    setPermitDeadline(detectedPermit.deadline);
    toast.success('Loaded buyer permit details into form!');
  };

  const handleSignatureChange = (val: string) => {
    const trimmed = val.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.signature) {
          setPermitSignature(parsed.signature);
          if (parsed.deadline) {
            setPermitDeadline(Number(parsed.deadline));
          }
          if (parsed.buyer && (!newOwnerAddress || newOwnerAddress.trim() === '')) {
            setNewOwnerAddress(parsed.buyer);
          }
          toast.success('Extracted signature, deadline, and buyer address from package!');
          return;
        }
      } catch {
        // Not valid JSON, treat as raw text
      }
    }
    setPermitSignature(val);
  };


  const isOwner =
    account &&
    onChainData?.owner &&
    account.toLowerCase() === onChainData.owner.toLowerCase();

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-[#8247E5] rounded-full" />
        <h2 className="font-syne text-2xl text-[#0F172A]">
          Blockchain Title & Provenance
        </h2>
      </div>

      <div
        className={`bg-[#FAF8F5]/80 border ${
          isOwner
            ? 'border-amber-300 shadow-md ring-1 ring-amber-400/20'
            : 'border-[#E6E0DA] shadow-sm'
        } rounded-2xl p-6 transition-all duration-300`}
      >
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
              {networkLabel}
            </span>
          </div>
        </div>

        {/* Network / Status Badge */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isOwner && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs animate-in fade-in zoom-in-95 duration-200">
              <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
              You are the Owner
            </span>
          )}
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

      {/* Network Selector Tabs */}
      <div className="mb-3.5 p-1 bg-gray-100/90 rounded-xl flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={handleSelectAnvil}
          className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all font-semibold ${
            isAnvil
              ? 'bg-white text-[#1a1a2e] shadow-xs font-bold'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isAnvil ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
          ⚡ Local Anvil (31337)
        </button>
        <button
          type="button"
          onClick={handleSelectAmoy}
          className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all font-semibold ${
            !isAnvil
              ? 'bg-white text-[#8247E5] shadow-xs font-bold'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              !isAnvil ? 'bg-[#8247E5]' : 'bg-gray-300'
            }`}
          />
          🌐 Polygon Amoy (80002)
        </button>
      </div>

      {/* Wallet Connection Status Bar */}
      <div className="mb-4 bg-[#F8F9FA] rounded-xl p-3 text-xs flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-gray-600">
          <Wallet className="w-4 h-4 text-gray-500 shrink-0" />
          {account ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <span>Connected:</span>
              <span className="font-mono text-gray-800 font-medium">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              {isOwner && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-400" />
                  Owner
                </span>
              )}
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
        ) : chainId !== targetChainId ? (
          <div className="flex items-center gap-1.5">
            <span className="text-amber-600 font-medium text-[11px]">Wrong Network:</span>
            <button
              onClick={isAnvil ? switchToAnvil : switchToAmoy}
              className="text-xs font-semibold text-[#8247E5] hover:underline"
            >
              Switch to {isAnvil ? 'Anvil' : 'Amoy'}
            </button>
          </div>
        ) : (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {isAnvil ? 'Anvil Active' : 'Amoy Active'}
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
                ${Number(onChainData.price).toLocaleString()} USD (USDT)
              </span>
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border text-xs transition-colors ${
              isOwner
                ? 'bg-amber-50/40 border-amber-200 ring-1 ring-amber-300/30'
                : 'bg-[#FAF8F5] border-[#EFECE8]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500">Owner Address</span>
              {isOwner && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <Crown className="w-3 h-3 text-amber-600 fill-amber-400" />
                  You (Current Owner)
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-gray-800 break-all font-medium">
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

          {/* Prospective Buyer: Sign Acceptance Deed Tool */}
          {!isOwner && onChainData?.exists && (
            <div className="pt-2 border-t border-[#F0EBE6]">
              {!showBuyerSignModal ? (
                <button
                  type="button"
                  onClick={() => setShowBuyerSignModal(true)}
                  className="w-full text-xs font-medium text-gray-600 hover:text-[#8247E5] border border-dashed border-gray-300 hover:border-[#8247E5]/50 rounded-xl py-2 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Handshake className="w-3.5 h-3.5 text-[#8247E5]" />
                  Purchasing this property? Sign Deed Acceptance (0 Gas)
                </button>
              ) : (
                <div className="p-3.5 bg-purple-50/50 border border-purple-200/70 rounded-xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1a1a2e] flex items-center gap-1.5">
                      <FileSignature className="w-3.5 h-3.5 text-[#8247E5]" />
                      EIP-712 Deed Acceptance
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBuyerSignModal(false);
                        setGeneratedSignature(null);
                        setGeneratedPermit(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 text-[11px]"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Sign a cryptographic acceptance deed off-chain using your connected wallet. This proves your consent to receive the property deed with <strong>0 gas cost</strong>.
                  </p>

                  {!generatedSignature ? (
                    <button
                      type="button"
                      onClick={handleGenerateBuyerAcceptance}
                      disabled={isTransacting}
                      className="w-full bg-[#8247E5] hover:bg-[#6a34c9] text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isTransacting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Handshake className="w-3.5 h-3.5" />
                          Sign Acceptance in Wallet (Free, 0 Gas)
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2.5 bg-white p-3 rounded-lg border border-purple-100 shadow-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Acceptance Deed Signed
                        </span>
                        <div className="flex items-center gap-2">
                          {generatedPermit && (
                            <button
                              type="button"
                              onClick={() => handleCopyPackage(generatedPermit)}
                              className="text-[#8247E5] hover:underline font-semibold flex items-center gap-0.5"
                            >
                              {copiedPackage ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              {copiedPackage ? 'Copied JSON' : 'Copy Permit JSON'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopySignature(generatedSignature)}
                            className="text-gray-500 hover:text-gray-700 text-[10px] underline flex items-center gap-0.5"
                          >
                            {copiedSignature ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {copiedSignature ? 'Copied' : 'Copy Sig'}
                          </button>
                        </div>
                      </div>

                      {generatedPermit && (
                        <div className="bg-purple-50/60 p-2 rounded-lg text-[11px] space-y-1 text-purple-900 border border-purple-100">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Signer (Buyer):</span>
                            <span className="font-mono text-gray-800 font-medium truncate max-w-[170px]">
                              {generatedPermit.buyer}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#8247E5]" />
                              Expires:
                            </span>
                            <span className="font-semibold text-[#8247E5]">
                              {generatedPermit.expiresAt}
                            </span>
                          </div>
                        </div>
                      )}

                      <p className="font-mono text-[10px] text-gray-700 break-all bg-gray-50 p-2 rounded border border-gray-200 max-h-16 overflow-y-auto">
                        {generatedSignature}
                      </p>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Permit saved to browser! The seller can load this permit automatically or paste the JSON package to execute the zero-gas closing.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Owner Transfer Option */}
          {isOwner && (
            <div className="pt-3 border-t border-[#F0EBE6] space-y-3">
              <div className="p-3 bg-gradient-to-r from-amber-50/80 via-purple-50/40 to-white border border-amber-200/70 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#1a1a2e]">Deed Confirmed</p>
                  <p className="text-[11px] text-gray-600">
                    Your connected wallet holds full on-chain ownership rights to this property.
                  </p>
                </div>
              </div>

              {!showTransfer ? (
                <button
                  onClick={() => setShowTransfer(true)}
                  className="w-full text-xs font-semibold text-[#8247E5] border border-[#8247E5]/30 rounded-xl py-2 hover:bg-[#8247E5]/5 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Transfer Ownership (Direct or Mutual Consent)
                </button>
              ) : (
                <form onSubmit={handleTransfer} className="space-y-3 mt-2">
                  {/* Transfer Mode Selector */}
                  <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setTransferMode('direct')}
                      className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                        transferMode === 'direct'
                          ? 'bg-white text-gray-800 shadow-xs'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Direct Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferMode('permit')}
                      className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                        transferMode === 'permit'
                          ? 'bg-white text-[#8247E5] shadow-xs'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Handshake className="w-3.5 h-3.5" />
                      Mutual Consent (EIP-712)
                    </button>
                  </div>

                  {transferMode === 'direct' ? (
                    <p className="text-[11px] text-gray-500 leading-tight">
                      Instant 1-step transfer in a single transaction (~45k gas). Recipient does not need to pre-sign.
                    </p>
                  ) : (
                    <div className="p-2.5 bg-purple-50/60 rounded-lg border border-purple-200/60 text-[11px] text-purple-900 space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <Handshake className="w-3.5 h-3.5 text-[#8247E5]" />
                        Zero Extra Gas Real Estate Closing
                      </p>
                      <p className="text-gray-600 text-[10px]">
                        Buyer signs off-chain for <strong>0 gas</strong>. You execute the deed change in 1 transaction (~53k gas), avoiding double gas fees!
                      </p>
                    </div>
                  )}

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

                  {transferMode === 'permit' && (
                    <>
                      {detectedPermit && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-lg text-xs flex items-center justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-semibold text-emerald-900 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              Buyer Permit Detected
                            </p>
                            <p className="text-emerald-700 text-[10px] truncate">
                              Buyer: <span className="font-mono">{detectedPermit.buyer.slice(0, 6)}...{detectedPermit.buyer.slice(-4)}</span> • Expires: {detectedPermit.expiresAt}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyDetectedPermit}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-[11px] transition-colors shrink-0 shadow-xs"
                          >
                            Auto-Fill Permit
                          </button>
                        </div>
                      )}

                      <div className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-gray-600 font-medium">
                            Buyer's EIP-712 Permit (JSON or 0x Signature)
                          </label>
                          {permitDeadline && (
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Exact Deadline Synced
                            </span>
                          )}
                        </div>
                        <textarea
                          required
                          rows={2}
                          placeholder="Paste JSON permit package or raw 0x... signature here"
                          value={permitSignature}
                          onChange={(e) => handleSignatureChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#8247E5] resize-none"
                        />
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Pasting the full JSON package automatically syncs the exact deadline and recipient address.
                        </p>
                      </div>

                      {permitDeadline ? (
                        <div className="flex items-center justify-between text-[11px] text-gray-600 bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                          <span className="flex items-center gap-1 font-medium text-purple-900">
                            <Clock className="w-3.5 h-3.5 text-[#8247E5]" />
                            Signed Expiration Deadline:
                          </span>
                          <span className="font-mono text-purple-950 font-semibold text-[10px]">
                            {new Date(permitDeadline * 1000).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs">
                          <label className="block text-gray-600 font-medium mb-1">
                            Permit Validity Window (Manual)
                          </label>
                          <select
                            value={permitHours}
                            onChange={(e) => setPermitHours(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#8247E5]"
                          >
                            <option value="24">24 Hours</option>
                            <option value="48">48 Hours</option>
                            <option value="168">7 Days</option>
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isTransacting}
                      className="flex-1 bg-[#8247E5] hover:bg-[#6a34c9] text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      {isTransacting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : transferMode === 'direct' ? (
                        'Confirm Direct Transfer'
                      ) : (
                        'Execute Mutual Closing'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTransfer(false);
                        setPermitDeadline(null);
                        setPermitSignature('');
                        setNewOwnerAddress('');
                      }}
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
            Record this property on the {isAnvil ? 'local Anvil node' : 'Polygon Amoy testnet'} smart contract to
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
              <label htmlFor="usdPrice" className="text-gray-600 font-medium">
                On-Chain Price (USD / USDT):
              </label>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 font-mono text-xs">$</span>
                <input
                  id="usdPrice"
                  type="number"
                  step="1000"
                  min="1"
                  value={registrationPrice}
                  onChange={(e) => setRegistrationPrice(e.target.value)}
                  className="w-28 px-2 py-1 border border-gray-300 rounded text-right font-mono text-xs focus:outline-none focus:border-[#8247E5]"
                />
              </div>
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
            {isAnvil ? (
              <span className="inline-flex items-center gap-1 text-gray-500 font-mono text-[11px] bg-emerald-100/60 px-2 py-0.5 rounded">
                Local Anvil Tx
              </span>
            ) : (
              <a
                href={`https://amoy.polygonscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#8247E5] hover:underline font-semibold"
              >
                View on Amoy Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
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
      {displayContractAddress && displayContractAddress !== '0x0000000000000000000000000000000000000000' && (
        <div className="mt-4 pt-3 border-t border-[#F0EBE6] text-[11px] text-gray-400 flex items-center justify-between">
          <span>
            Contract ({isAnvil ? 'Anvil' : 'Amoy'}):{' '}
            <span className="font-mono">{displayContractAddress.slice(0, 6)}...{displayContractAddress.slice(-4)}</span>
          </span>
          {isAnvil ? (
            <span className="inline-flex items-center gap-1 text-gray-500 font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
              Localhost:8545
            </span>
          ) : (
            <a
              href={`https://amoy.polygonscan.com/address/${displayContractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600 transition-colors inline-flex items-center gap-0.5"
            >
              PolygonScan <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default BlockchainRegistryCard;
