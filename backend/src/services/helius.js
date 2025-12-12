const axios = require('axios');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Platform Map (kept for reference in parser, or if we need to enrich data here)
const PLATFORM_MAP = {
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter",
    "JupTRTTgyqKPceQAy9fTRbh5JV571utBWmwFIG7s7P5": "Jupiter Limit Order",
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium",
    "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h": "Raydium V3",
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWq": "Raydium CLMM",
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca",
    "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqG25nD6vRKQcnD": "Phoenix",
    "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K": "Magic Eden",
    "TCMPhJdwDryooaGtiocG1uEfpHJXT7NsJy33PKgLM70": "Tensor",
    "p1exdMJcjVao65QdewkaZRUnU6VPSXndy24EFnnfMgi": "Metaplex",
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": "Pump.fun"
};

const fetchTransactions = async (address, limit = 100) => {
    try {
        const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`;
        console.log(`Fetching transactions for ${address}...`);
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching transactions:", error.response?.data || error.message);
        throw new Error("Failed to fetch transactions from Helius");
    }
};

const fetchAssets = async (address) => {
    try {
        const response = await axios.post(HELIUS_RPC, {
            jsonrpc: '2.0',
            id: 'get-assets',
            method: 'getAssetsByOwner',
            params: {
                ownerAddress: address,
                page: 1,
                limit: 100,
                displayOptions: {
                    showFungible: true,
                    showNativeBalance: true
                }
            }
        });

        const items = response.data.result?.items || [];
        const nativeBalance = response.data.result?.nativeBalance?.lamports || 0;

        return {
            items,
            nativeBalance: nativeBalance / 1e9 // Convert lamports to SOL
        };
    } catch (error) {
        console.error("Error fetching assets:", error.response?.data || error.message);
        throw new Error("Failed to fetch assets from Helius");
    }
};

module.exports = {
    fetchTransactions,
    fetchAssets,
    PLATFORM_MAP
};
