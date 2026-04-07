import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Map of cryptocurrencies to their available networks
const CRYPTO_NETWORKS: Record<string, string[]> = {
  usdt: ['ethereum', 'tron', 'polygon', 'bsc'],
  usdc: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
  dai: ['ethereum', 'polygon'],
  busd: ['ethereum', 'bsc'],
  bitcoin: ['mainnet'],
  ethereum: ['mainnet'],
  solana: ['mainnet'],
  cardano: ['mainnet'],
  ripple: ['mainnet'],
  litecoin: ['mainnet'],
  dogecoin: ['mainnet'],
  avalanche: ['mainnet'],
  polygon: ['mainnet'],
  optimism: ['mainnet'],
  arbitrum: ['mainnet'],
  cosmos: ['mainnet'],
  monero: ['mainnet'],
};

export async function GET(req: NextRequest) {
  try {
    const walletConfig = await db.getWalletConfig();
    
    // Get the request cryptocurrency from query params
    const { searchParams } = new URL(req.url);
    const crypto = searchParams.get('crypto')?.toLowerCase();

    if (!crypto) {
      return NextResponse.json(
        { error: 'Cryptocurrency parameter required' },
        { status: 400 }
      );
    }

    // Get available networks for this cryptocurrency
    const networks = CRYPTO_NETWORKS[crypto] || [];

    if (networks.length === 0) {
      return NextResponse.json(
        { error: `No networks available for ${crypto}` },
        { status: 400 }
      );
    }

    // Build network options with addresses
    const networkOptions = networks.map((network) => {
      // Try to find wallet address with network suffix (e.g., "usdt_ethereum", "usdt_tron")
      const keyWithNetwork = `${crypto}_${network}`;
      const keyWithoutNetwork = crypto;
      
      const address = walletConfig[keyWithNetwork] || walletConfig[keyWithoutNetwork] || '';
      
      return {
        network,
        address,
        isConfigured: !!address,
      };
    });

    // Filter to only configured networks
    const configuredNetworks = networkOptions.filter(n => n.isConfigured);

    // If no networks are configured, return error with available networks
    if (configuredNetworks.length === 0) {
      return NextResponse.json({
        error: `No wallet configured for ${crypto}. Available networks: ${networks.join(', ')}. Please contact admin.`,
        availableNetworks: networks,
      }, { status: 400 });
    }

    return NextResponse.json({
      cryptocurrency: crypto,
      networks: configuredNetworks,
      totalNetworks: configuredNetworks.length,
    });
  } catch (error: any) {
    console.error('[NETWORKS] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch networks' },
      { status: 500 }
    );
  }
}
