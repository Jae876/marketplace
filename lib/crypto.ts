import { ethers } from 'ethers';

export interface WalletInfo {
  address: string;
  privateKey: string;
}

export interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  color: string;
  networks?: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
}

export function generateWallet(): WalletInfo {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

export const SUPPORTED_CRYPTOS: Cryptocurrency[] = [
  // Top 10 by Market Cap
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', icon: '₿', color: 'orange' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', color: 'blue' },
  { 
    id: 'tether', 
    name: 'Tether', 
    symbol: 'USDT', 
    icon: '₮', 
    color: 'green',
    networks: [
      { id: 'ethereum', name: 'Ethereum Network', icon: 'Ξ' },
      { id: 'arbitrum', name: 'Arbitrum One', icon: '⬜' },
      { id: 'optimism', name: 'Optimism', icon: '⊛' },
      { id: 'polygon', name: 'Polygon', icon: '◈' },
      { id: 'avalanche', name: 'Avalanche C-Chain', icon: '▲' },
      { id: 'tron', name: 'TRON Network', icon: '⬡' },
      { id: 'solana', name: 'Solana', icon: '◎' },
    ]
  },
  { id: 'bnb', name: 'BNB', symbol: 'BNB', icon: '⬛', color: 'yellow' },
  { id: 'xrp', name: 'XRP', symbol: 'XRP', icon: '✕', color: 'blue' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', icon: '◎', color: 'purple' },
  { 
    id: 'usdc', 
    name: 'USD Coin', 
    symbol: 'USDC', 
    icon: '$', 
    color: 'cyan',
    networks: [
      { id: 'ethereum', name: 'Ethereum Network', icon: 'Ξ' },
      { id: 'arbitrum', name: 'Arbitrum One', icon: '⬜' },
      { id: 'optimism', name: 'Optimism', icon: '⊛' },
      { id: 'polygon', name: 'Polygon', icon: '◈' },
      { id: 'avalanche', name: 'Avalanche C-Chain', icon: '▲' },
      { id: 'solana', name: 'Solana', icon: '◎' },
      { id: 'base', name: 'Base', icon: '⬜' },
    ]
  },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', icon: '₳', color: 'indigo' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', icon: '🐕', color: 'yellow' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', icon: '◈', color: 'purple' },

  // Top 11-30
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', icon: '●', color: 'pink' },
  { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', icon: 'Ł', color: 'gray' },
  { id: 'bitcoin-cash', name: 'Bitcoin Cash', symbol: 'BCH', icon: '฿', color: 'orange' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', icon: '🔗', color: 'sky' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', icon: '⬜', color: 'blue' },
  { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', icon: '▲', color: 'red' },
  { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', icon: '🦄', color: 'pink' },
  { id: 'tron', name: 'TRON', symbol: 'TRX', icon: '⬡', color: 'red' },
  { 
    id: 'steth', 
    name: 'Lido Staked ETH', 
    symbol: 'stETH', 
    icon: '◇', 
    color: 'indigo',
    networks: [
      { id: 'ethereum', name: 'Ethereum Network', icon: 'Ξ' },
      { id: 'arbitrum', name: 'Arbitrum One', icon: '⬜' },
    ]
  },
  { 
    id: 'wbtc', 
    name: 'Wrapped Bitcoin', 
    symbol: 'WBTC', 
    icon: '🔗', 
    color: 'orange',
    networks: [
      { id: 'ethereum', name: 'Ethereum Network', icon: 'Ξ' },
      { id: 'arbitrum', name: 'Arbitrum One', icon: '⬜' },
      { id: 'optimism', name: 'Optimism', icon: '⊛' },
    ]
  },

  // Top 31-50
  { id: 'monero', name: 'Monero', symbol: 'XMR', icon: '₥', color: 'orange' },
  { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', icon: '☉', color: 'purple' },
  { id: 'optimism', name: 'Optimism', symbol: 'OP', icon: '⊛', color: 'red' },
  { id: 'zcash', name: 'Zcash', symbol: 'ZEC', icon: 'ⓩ', color: 'yellow' },
  { id: 'aave', name: 'Aave', symbol: 'AAVE', icon: '👻', color: 'indigo' },
  { id: 'compound', name: 'Compound', symbol: 'COMP', icon: 'ⓒ', color: 'green' },
  { id: 'maker', name: 'Maker', symbol: 'MKR', icon: 'Ⓜ', color: 'emerald' },
  { id: 'curve', name: 'Curve', symbol: 'CRV', icon: '⟿', color: 'amber' },
  { id: 'dai', name: 'Dai', symbol: 'DAI', icon: '◇', color: 'yellow' },
  { id: 'busd', name: 'Binance USD', symbol: 'BUSD', icon: '฿', color: 'yellow' },

  // Top 51-70
  { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR', icon: '◉', color: 'black' },
  { id: 'vechain', name: 'VeChain', symbol: 'VET', icon: '✓', color: 'cyan' },
  { id: 'iota', name: 'IOTA', symbol: 'IOTA', icon: 'Ι', color: 'purple' },
  { id: 'aptos', name: 'Aptos', symbol: 'APT', icon: '◆', color: 'black' },
  { id: 'filecoin', name: 'Filecoin', symbol: 'FIL', icon: '⚒', color: 'white' },
  { id: 'usd-e', name: 'Ethena USDe', symbol: 'USDe', icon: 'є', color: 'sky' },
  { id: 'leo', name: 'Unus Sed Leo', symbol: 'LEO', icon: '🦁', color: 'yellow' },
  { id: 'okb', name: 'OKX Token', symbol: 'OKB', icon: '◉', color: 'black' },
  { id: 'stx', name: 'Stacks', symbol: 'STX', icon: '∿', color: 'orange' },
  { id: 'sui', name: 'Sui', symbol: 'SUI', icon: '✦', color: 'blue' },

  // Top 71-90
  { id: 'casper', name: 'Casper', symbol: 'CSPR', icon: '❋', color: 'blue' },
  { id: 'hedera', name: 'Hedera', symbol: 'HBAR', icon: '⦵', color: 'purple' },
  { id: 'theta', name: 'Theta Token', symbol: 'THETA', icon: 'Θ', color: 'pink' },
  { id: 'gala', name: 'Gala', symbol: 'GALA', icon: '◇', color: 'blue' },
  { id: 'decentraland', name: 'Decentraland', symbol: 'MANA', icon: '◈', color: 'purple' },
  { id: 'sandbox', name: 'The Sandbox', symbol: 'SAND', icon: '🏗', color: 'yellow' },
  { id: 'axie', name: 'Axie Infinity', symbol: 'AXS', icon: '⚔', color: 'blue' },
  { id: 'ens', name: 'Ethereum Name Service', symbol: 'ENS', icon: 'Ξ', color: 'blue' },
  { id: 'arbitrum-nova', name: 'Arbitrum Nova', symbol: 'ANVA', icon: '⬜', color: 'blue' },
  { id: 'kaspa', name: 'Kaspa', symbol: 'KAS', icon: '◊', color: 'blue' },

  // Top 91-110
  { id: 'render', name: 'Render Network', symbol: 'RNDR', icon: '🎬', color: 'purple' },
  { id: 'immutable', name: 'Immutable X', symbol: 'IMX', icon: '✦', color: 'pink' },
  { id: 'celo', name: 'Celo', symbol: 'CELO', icon: '◉', color: 'green' },
  { id: 'cosmos-hub', name: 'Cosmos Hub', symbol: 'ATOM', icon: '☉', color: 'purple' },
  { id: 'algorand', name: 'Algorand', symbol: 'ALGO', icon: '⧉', color: 'teal' },
  { id: 'fantom', name: 'Fantom', symbol: 'FTM', icon: '◇', color: 'cyan' },
  { id: 'harmony', name: 'Harmony', symbol: 'ONE', icon: '◎', color: 'blue' },
  { id: 'zilliqa', name: 'Zilliqa', symbol: 'ZIL', icon: '◆', color: 'teal' },
  { id: 'elrond', name: 'Elrond', symbol: 'EGLD', icon: '🔥', color: 'orange' },
  { id: 'ckb', name: 'Nervos CKB', symbol: 'CKB', icon: '◻', color: 'green' },

  // Additional Popular Tokens 111-130
  { id: 'neo', name: 'NEO', symbol: 'NEO', icon: '◉', color: 'green' },
  { id: 'verasity', name: 'Verasity', symbol: 'VRA', icon: '▶', color: 'red' },
  { id: 'fetch-ai', name: 'Fetch.ai', symbol: 'FET', icon: '🤖', color: 'purple' },
  { id: 'graph', name: 'The Graph', symbol: 'GRT', icon: '◈', color: 'purple' },
  { id: 'curve-dao', name: 'Curve DAO', symbol: 'CRV', icon: '⟿', color: 'amber' },
  { id: 'yearn', name: 'yearn.finance', symbol: 'YFI', icon: '◇', color: 'cyan' },
  { id: 'lido-dao', name: 'Lido DAO', symbol: 'LDO', icon: '◎', color: 'blue' },
  { id: 'hop-protocol', name: 'Hop Protocol', symbol: 'HOP', icon: '🦘', color: 'pink' },
  { id: 'arbitrum-one', name: 'Arbitrum One', symbol: 'ARBO', icon: '⬜', color: 'blue' },
  { id: 'base', name: 'Base', symbol: 'BASE', icon: '⬜', color: 'blue' },
];

// Real-time cryptocurrency prices (USD)
// These are cached prices that should be fetched from a price API in production
// For now, using approximate market prices as of latest market data
export const CRYPTO_PRICES: Record<string, number> = {
  'bitcoin': 43500,
  'ethereum': 2300,
  'tether': 1.00,
  'bnb': 612,
  'xrp': 2.40,
  'solana': 165,
  'usdc': 1.00,
  'cardano': 0.75,
  'dogecoin': 0.28,
  'polygon': 0.85,
  'polkadot': 8.20,
  'litecoin': 105,
  'bitcoin-cash': 450,
  'chainlink': 18.50,
  'arbitrum': 2.10,
  'avalanche': 40,
  'uniswap': 12.50,
  'tron': 0.12,
  'steth': 2450,
  'wbtc': 43500,
  'monero': 185,
  'cosmos': 12.30,
  'optimism': 3.50,
  'zcash': 65,
  'aave': 350,
  'compound': 125,
  'maker': 2800,
  'curve': 1.20,
  'dai': 1.00,
  'busd': 1.00,
  'near': 7.50,
  'vechain': 0.065,
  'iota': 0.35,
  'aptos': 10.50,
  'filecoin': 15,
  'usd-e': 1.00,
  'leo': 8.75,
  'okb': 65,
  'stx': 3.20,
  'sui': 1.80,
};

/**
 * Convert USD amount to cryptocurrency amount
 * @param usdAmount Amount in USD
 * @param cryptoId Cryptocurrency ID
 * @returns Amount in cryptocurrency with 8 decimal precision
 */
export function convertUsdToCrypto(usdAmount: number, cryptoId: string): number {
  const price = CRYPTO_PRICES[cryptoId.toLowerCase()];
  if (!price) {
    console.warn(`Price not found for cryptocurrency: ${cryptoId}`);
    return 0;
  }
  
  // Divide USD amount by price per unit to get crypto amount
  return parseFloat((usdAmount / price).toFixed(8));
}

/**
 * Convert cryptocurrency amount to USD
 * @param cryptoAmount Amount in cryptocurrency
 * @param cryptoId Cryptocurrency ID
 * @returns Amount in USD with 2 decimal precision
 */
export function convertCryptoToUsd(cryptoAmount: number, cryptoId: string): number {
  const price = CRYPTO_PRICES[cryptoId.toLowerCase()];
  if (!price) {
    console.warn(`Price not found for cryptocurrency: ${cryptoId}`);
    return 0;
  }
  
  return parseFloat((cryptoAmount * price).toFixed(2));
}

/**
 * Format cryptocurrency amount for display
 * @param amount Amount in cryptocurrency
 * @param symbol Cryptocurrency symbol
 * @returns Formatted string like "0.0025 BTC"
 */
export function formatCryptoAmount(amount: number, symbol: string): string {
  // Determine decimal places based on amount
  let decimals = 8;
  if (amount >= 1) decimals = 4;
  if (amount >= 100) decimals = 2;
  
  return `${amount.toFixed(decimals)} ${symbol}`;
}

/**
 * Get cryptocurrency details by ID
 * @param cryptoId Cryptocurrency ID
 * @returns Cryptocurrency object or undefined
 */
export function getCryptoById(cryptoId: string): Cryptocurrency | undefined {
  return SUPPORTED_CRYPTOS.find((crypto) => crypto.id === cryptoId.toLowerCase());
}
