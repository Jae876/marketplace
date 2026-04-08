'use client';

import { useState, useEffect } from 'react';
import CryptoDropdown from './CryptoDropdown';

interface AddFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositConfirmed?: (amount: number) => void;
}

interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  color: string;
}

interface NetworkOption {
  id: string;
  name: string;
}

// Multi-network cryptocurrencies with their available networks
const MULTI_NETWORK_CRYPTOS: Record<string, NetworkOption[]> = {
  usdt: [
    { id: 'ethereum', name: 'Ethereum Network' },
    { id: 'tron', name: 'Tron Network' },
    { id: 'polygon', name: 'Polygon Network' },
    { id: 'bsc', name: 'BSC Network' },
  ],
  usdc: [
    { id: 'ethereum', name: 'Ethereum Network' },
    { id: 'polygon', name: 'Polygon Network' },
    { id: 'arbitrum', name: 'Arbitrum Network' },
    { id: 'optimism', name: 'Optimism Network' },
  ],
  dai: [
    { id: 'ethereum', name: 'Ethereum Network' },
    { id: 'polygon', name: 'Polygon Network' },
  ],
  busd: [
    { id: 'ethereum', name: 'Ethereum Network' },
    { id: 'bsc', name: 'BSC Network' },
  ],
};

export default function AddFundsModal({ isOpen, onClose, onDepositConfirmed }: AddFundModalProps) {
  const [step, setStep] = useState<'crypto' | 'network' | 'amount' | 'confirm'>('crypto');
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption | null>(null);
  const [amountUsd, setAmountUsd] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('0');
  const [walletAddress, setWalletAddress] = useState('');
  const [depositId, setDepositId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  // Auto-show crypto options when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('crypto');
    }
  }, [isOpen]);

  // Reset states when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('crypto');
        setSelectedCrypto(null);
        setSelectedNetwork(null);
        setAmountUsd('');
        setCryptoAmount('0');
        setWalletAddress('');
        setDepositId('');
        setError('');
        setConfirmationStatus('idle');
      }, 300);
    }
  }, [isOpen]);

  // Handle crypto selection
  const handleCryptoSelect = (crypto: CryptoOption) => {
    setSelectedCrypto(crypto);
    setSelectedNetwork(null);
    setAmountUsd('');
    setCryptoAmount('0');
    setWalletAddress('');
    setError('');
    
    // Check if this crypto has multiple networks
    const hasMultipleNetworks = MULTI_NETWORK_CRYPTOS[crypto.id];
    if (hasMultipleNetworks) {
      setStep('network');
    } else {
      setStep('amount');
    }
  };

  // Handle network selection
  const handleNetworkSelect = (network: NetworkOption) => {
    setSelectedNetwork(network);
    setAmountUsd('');
    setCryptoAmount('0');
    setWalletAddress('');
    setError('');
    setStep('amount');
  };

  // Simulate crypto price lookup - in production, use real API
  const getLiveExchangeRate = (cryptocurrency: string): number => {
    const rates: Record<string, number> = {
      bitcoin: 45000,
      ethereum: 2500,
      usdt: 1,
      usdc: 1,
      dai: 1,
      busd: 1,
      cardano: 0.95,
      solana: 180,
      polkadot: 12,
      ripple: 2.5,
      litecoin: 150,
      dogecoin: 0.35,
      avalanche: 35,
      polygon: 0.8,
      optimism: 2.5,
      arbitrum: 1.2,
      cosmos: 10,
      monero: 180,
    };
    return rates[cryptocurrency.toLowerCase()] || 1;
  };

  // Update crypto amount in real time
  const handleAmountChange = (value: string) => {
    setAmountUsd(value);
    setError('');

    if (!selectedCrypto || !value) {
      setCryptoAmount('0');
      return;
    }

    const usdAmount = parseFloat(value);
    if (isNaN(usdAmount) || usdAmount <= 0) {
      setCryptoAmount('0');
      return;
    }

    const rate = getLiveExchangeRate(selectedCrypto.id);
    const cryptoAmt = (usdAmount / rate).toFixed(8);
    setCryptoAmount(cryptoAmt);
  };

  // Get the cryptocurrency key to send to the API
  const getCryptoKeyForAPI = (): string => {
    // Send ONLY the base crypto name (usdt, usdc, etc) - same as product purchase
    // Network selection is UI only, doesn't affect backend lookup
    return selectedCrypto?.id || '';
  };

  // Create deposit transaction
  const handleCreateDeposit = async () => {
    if (!selectedCrypto || !amountUsd) {
      setError('Please enter an amount');
      return;
    }

    const usdAmount = parseFloat(amountUsd);
    if (isNaN(usdAmount) || usdAmount < 5) {
      setError('Minimum deposit is $5 USD');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const cryptoKey = getCryptoKeyForAPI();
      
      const response = await fetch('/api/payment/deposit/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cryptocurrency: cryptoKey,
          amountUsd: usdAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create deposit');
        setLoading(false);
        return;
      }

      setDepositId(data.depositId);
      setWalletAddress(data.walletAddress);
      setCryptoAmount(data.cryptoAmount);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Failed to create deposit');
    } finally {
      setLoading(false);
    }
  };

  // Confirm deposit - update balance
  const handleConfirmDeposit = async () => {
    if (!depositId) return;

    setConfirming(true);
    setConfirmationStatus('processing');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionId: depositId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to confirm deposit');
        setConfirmationStatus('error');
        setConfirming(false);
        return;
      }

      setConfirmationStatus('success');
      
      // Notify parent component
      onDepositConfirmed?.(parseFloat(amountUsd));

      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm deposit');
      setConfirmationStatus('error');
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with fade transition - Higher z-index to appear on top */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[99950] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Modal Container - Higher z-index than balance badge */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-[99951] p-4 transition-all duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      >
        <div
          className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Decorative Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

          {/* Header */}
          <div className="px-6 py-6 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-light text-white tracking-tight">Add Funds</h2>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 text-2xl w-8 h-8 rounded-full hover:bg-slate-800/50 transition-all flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">Deposit cryptocurrency to increase your balance</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Step 1: Crypto Selection */}
            {step === 'crypto' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-400 block mb-3">
                    Select Cryptocurrency
                  </label>
                  <CryptoDropdown
                    selected={selectedCrypto}
                    onSelect={handleCryptoSelect}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Network Selection (for multi-network coins) */}
            {step === 'network' && selectedCrypto && (
              <div className="space-y-4 animate-fade-in">
                {/* Back Button */}
                <button
                  onClick={() => setStep('crypto')}
                  className="text-sm text-slate-300 hover:text-green-400 transition-colors flex items-center space-x-2 py-2 px-2 -ml-2 hover:bg-slate-800/30 rounded"
                >
                  <span className="text-base">←</span>
                  <span>Back</span>
                </button>

                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-400 block mb-3">
                    Select Network
                  </label>
                  <div className="space-y-2">
                    {MULTI_NETWORK_CRYPTOS[selectedCrypto.id]?.map((network: NetworkOption) => (
                      <button
                        key={network.id}
                        onClick={() => handleNetworkSelect(network)}
                        className="w-full p-3 rounded-lg border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 hover:border-green-500/50 text-left transition-all group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-slate-600 group-hover:bg-green-500 transition-colors" />
                          <span className="text-sm text-slate-200 group-hover:text-green-400 transition-colors">{network.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Amount Input */}
            {step === 'amount' && (
              <div className="space-y-5 animate-fade-in">
                {/* Back Button + Selected Crypto / Network */}
                <div className="pt-4 pb-2 flex items-center justify-between border-b border-slate-700/30">
                  <button
                    onClick={() => {
                      if (selectedNetwork) {
                        setSelectedNetwork(null);
                        setStep('network');
                      } else {
                        setStep('crypto');
                      }
                    }}
                    className="text-sm text-slate-300 hover:text-green-400 transition-colors flex items-center space-x-2 py-2 px-2 -ml-2 hover:bg-slate-800/30 rounded"
                  >
                    <span className="text-base">←</span>
                    <span>{selectedNetwork ? 'Change Network' : 'Change Crypto'}</span>
                  </button>
                  {selectedCrypto && (
                    <div className="flex items-center space-x-3 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/30">
                      <span className="text-xl">{selectedCrypto.icon}</span>
                      <span className="text-sm font-medium text-slate-200">{selectedCrypto.symbol}</span>
                      {selectedNetwork && (
                        <>
                          <div className="w-px h-4 bg-slate-600/30" />
                          <span className="text-xs text-slate-400">{selectedNetwork.name}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                <div className="pt-4 space-y-3">
                  <label className="text-xs uppercase tracking-widest text-slate-400 block mb-2">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={amountUsd}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="Enter amount"
                      min="5"
                      step="0.01"
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 pl-7 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Minimum deposit: $5 USD</p>
                </div>

                {/* Real-time Conversion Display */}
                {amountUsd && parseFloat(amountUsd) > 0 && (
                  <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">You'll receive:</span>
                      <span className="text-lg font-light text-slate-100">
                        {cryptoAmount} {selectedCrypto?.symbol}
                      </span>
                    </div>
                    <div className="h-px bg-slate-700/30" />
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Exchange Rate</span>
                      <span>1 {selectedCrypto?.symbol} = ${(parseFloat(amountUsd) / parseFloat(cryptoAmount || '1')).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={onClose}
                    className="px-4 py-3 rounded-lg font-medium text-sm bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-200 transition-all border border-slate-700/30"
                  >
                    ✕
                  </button>
                  <button
                    onClick={handleCreateDeposit}
                    disabled={loading || !amountUsd || parseFloat(amountUsd) < 5}
                    className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                      loading || !amountUsd || parseFloat(amountUsd) < 5
                        ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600 hover:shadow-lg hover:shadow-green-500/20'
                    }`}
                  >
                    {loading ? 'Processing...' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation & Deposit Address */}
            {step === 'confirm' && (
              <div className="space-y-4 animate-fade-in">
                {/* Summary */}
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Coin</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{selectedCrypto?.icon}</span>
                      <span className="text-sm font-medium text-slate-200">{selectedCrypto?.symbol}</span>
                    </div>
                  </div>
                  {selectedNetwork && (
                    <>
                      <div className="h-px bg-slate-700/30" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Network</span>
                        <span className="text-sm font-light text-slate-100">{selectedNetwork.name}</span>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-slate-700/30" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Amount (USD)</span>
                    <span className="text-sm font-light text-slate-100">${amountUsd}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">You'll Send</span>
                    <span className="text-sm font-light text-slate-100">{cryptoAmount} {selectedCrypto?.symbol}</span>
                  </div>
                </div>

                {/* Deposit Address */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-400 block mb-3">
                    Send to this address
                  </label>
                  <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 relative group">
                    <p className="text-xs text-slate-300 font-mono break-all leading-relaxed">{walletAddress}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(walletAddress);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white px-2 py-1 rounded text-xs transition-all"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Double-check the address. This cannot be undone.
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium text-slate-300">Steps:</p>
                  <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                    <li>Open your wallet (MetaMask, Exodus, etc.)</li>
                    <li>Send {cryptoAmount} {selectedCrypto?.symbol} to the address above</li>
                    <li>Wait for network confirmation (~1-5 minutes)</li>
                    <li>Click "Confirm Deposit" below</li>
                  </ol>
                </div>

                {/* Error Display */}
                {error && confirmationStatus === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* Success Display */}
                {confirmationStatus === 'success' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 animate-pulse">
                    <p className="text-xs text-green-400">✓ Deposit confirmed! Your balance will update shortly.</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep('amount')}
                    disabled={confirming}
                    className="flex-1 py-3 rounded-lg font-medium text-sm border border-slate-700/50 text-slate-300 hover:text-slate-200 hover:border-slate-600/50 hover:bg-slate-800/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmDeposit}
                    disabled={confirming || confirmationStatus === 'success'}
                    className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                      confirmationStatus === 'success'
                        ? 'bg-green-600/20 text-green-400 cursor-not-allowed'
                        : confirming
                        ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600 hover:shadow-lg hover:shadow-green-500/20'
                    }`}
                  >
                    {confirming ? 'Confirming...' : confirmationStatus === 'success' ? '✓ Confirmed' : 'Confirm Deposit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
