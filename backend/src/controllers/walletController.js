const { fetchTransactions, fetchAssets } = require('../services/helius');
const { parseTransactions } = require('../services/parser');
const { fetchTokenPrices } = require('../services/price');

const analyzeWallet = async (req, res) => {
    try {
        const { address } = req.params;
        if (!address) return res.status(400).json({ error: "Wallet address required" });

        // 1. Parallel Fetch: History & Assets (for truth)
        // 1. Sequential Fetch (to avoid ECONNRESET / Rate Limits)
        // Fetch 100 txs (Helius max limit per call is often 100)
        console.log("Fetching transactions...");
        const transactions = await fetchTransactions(address, 100);

        console.log("Fetching assets...");
        const assetsData = await fetchAssets(address);

        // 2. Parse History (for Activity & Fees) of filtered items
        const { history, platformUsage, tokenStats } = parseTransactions(transactions, address);

        // 3. Build Portfolio from Assets (Source of Truth)
        const { items, nativeBalance } = assetsData;

        // Filter for fungible tokens that are actual tokens (not NFTs usually)
        // Helius DAS returns FungibleAsset or FungibleToken
        const tokens = items.filter(item =>
            (item.interface === 'FungibleToken' || item.interface === 'FungibleAsset') &&
            item.token_info?.balance > 0
        );

        // Prepare mints for price fetching
        // Add SOL mint manually to fetch SOL price
        const SOL_MINT = "So11111111111111111111111111111111111111112";
        const tokenMints = tokens.map(t => t.id);
        if (nativeBalance > 0) tokenMints.push(SOL_MINT);

        const priceMap = await fetchTokenPrices(tokenMints);

        // Construct Portfolio
        const portfolio = tokens.map(t => {
            const mint = t.id;
            const decimals = t.token_info.decimals;
            const balance = t.token_info.balance / Math.pow(10, decimals);
            const priceData = priceMap[mint];
            const price = priceData ? parseFloat(priceData.price) : 0;
            const valueUsd = balance * price;

            // Merge with history stats from parser
            const stats = tokenStats[mint] || { bought: 0, sold: 0 };

            return {
                mint,
                name: t.content?.metadata?.name || "Unknown",
                symbol: t.content?.metadata?.symbol || "UNK",
                image: t.content?.links?.image || "",
                balance,
                priceUsd: price,
                valueUsd,
                totalBought: stats.bought,
                totalSold: stats.sold
            };
        });

        // Add SOL Entry
        if (nativeBalance > 0) {
            const solPrice = priceMap[SOL_MINT] ? parseFloat(priceMap[SOL_MINT].price) : 0;
            portfolio.unshift({
                mint: SOL_MINT,
                name: "Solana",
                symbol: "SOL",
                image: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
                balance: nativeBalance,
                priceUsd: solPrice,
                valueUsd: nativeBalance * solPrice,
                totalBought: 0,
                totalSold: 0
            });
        }

        // Sort by Value
        portfolio.sort((a, b) => b.valueUsd - a.valueUsd);

        // Calculate summary stats
        let totalFeesSOL = history.reduce((acc, tx) => acc + (tx.fee || 0), 0);
        const netWorth = portfolio.reduce((acc, t) => acc + t.valueUsd, 0);

        // 4. Send Response
        res.json({
            summary: {
                netWorthUSD: netWorth.toFixed(2),
                totalFeesSOL: totalFeesSOL.toFixed(4),
                totalTx: transactions.length,
                mostUsedPlatform: Object.keys(platformUsage).sort((a, b) => platformUsage[b] - platformUsage[a])[0] || "None"
            },
            platforms: platformUsage,
            portfolio,
            history
        });

    } catch (error) {
        console.error("Analysis Controller Error:", error.message);
        res.status(500).json({ error: "Failed to analyze wallet", details: error.message });
    }
};

const getWalletRisk = async (req, res) => {
    try {
        const { address } = req.params;

        // Sequential fetch for stability
        const assetsData = await fetchAssets(address);
        const transactions = await fetchTransactions(address, 50); // Analyze last 50 txns for behavior

        const assets = assetsData.items;

        let riskScore = 100;
        let flags = [];
        let riskyTokens = [];
        let behaviorTags = [];

        // --- 1. Asset Analysis ---
        let totalValue = 0; // Rough estimate for Whale detection (requires prices, but we can infer from major tokens)
        let spamTokenCount = 0;

        for (const asset of assets) {
            const name = asset.content?.metadata?.name?.toLowerCase() || "";
            const symbol = asset.content?.metadata?.symbol?.toLowerCase() || "";

            // Spam/Phishing Detection
            if (name.includes("visit") || name.includes(".com") || name.includes("claim") || name.includes("reward")) {
                spamTokenCount++;
                if (spamTokenCount <= 5) { // Limit detailed reporting
                    riskyTokens.push({
                        mint: asset.id,
                        name: asset.content?.metadata?.name || "Unknown",
                        image: asset.content?.links?.image,
                        reasons: ["Likely spam/phishing token (URL or 'Claim' in name)"]
                    });
                }
            }
        }

        if (spamTokenCount > 0) {
            riskScore -= (spamTokenCount * 5);
            flags.push(`Held ${spamTokenCount} potential spam/phishing tokens`);
        }

        // --- 2. Transaction Behavior (Bot Detection) ---
        if (transactions.length > 10) {
            // Calculate average time difference between transactions
            let timeDiffs = [];
            for (let i = 0; i < transactions.length - 1; i++) {
                const diff = transactions[i].timestamp - transactions[i + 1].timestamp; // timestamps are sorted desc
                timeDiffs.push(Math.abs(diff));
            }

            const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;

            if (avgTimeDiff < 30) {
                riskScore -= 20;
                flags.push("High Frequency Activity (Avg < 30s between txs)");
                behaviorTags.push("High Frequency");
                if (avgTimeDiff < 10) behaviorTags.push("Bot Likely");
            }
        }

        // --- 3. Wallet Classification ---
        // (Simple heuristics without full price data here, using transaction patterns)
        const swapTx = transactions.filter(t => t.type === 'SWAP').length;
        if (swapTx > transactions.length * 0.5) behaviorTags.push("Trader");
        if (assets.length > 50) behaviorTags.push("Collector");

        // --- 4. Final Score Normalization ---
        if (riskScore < 0) riskScore = 0;

        let riskLevel = "Low";
        if (riskScore < 50) riskLevel = "High";
        else if (riskScore < 80) riskLevel = "Medium";

        res.json({
            riskScore,
            riskLevel,
            behaviorTags,
            flags,
            riskyTokens
        });

    } catch (error) {
        console.error("Risk Controller Error:", error.message);
        res.status(500).json({ error: "Failed to analyze risk" });
    }
};

module.exports = { analyzeWallet, getWalletRisk };
