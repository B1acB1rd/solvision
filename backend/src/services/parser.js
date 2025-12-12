const { PLATFORM_MAP } = require('./helius');

const parseTransactions = (transactions, walletAddress) => {
    const history = [];
    const platformUsage = {};
    const tokenStats = {};

    transactions.forEach(tx => {
        const fee = tx.fee / 1e9;

        // --- 1. Identify Platform ---
        let source = tx.source;
        if (source === "mMint" || source === "UNKNOWN") {
            const interactedProgram = tx.accountData?.find(acc => PLATFORM_MAP[acc.account]);
            if (interactedProgram) source = PLATFORM_MAP[interactedProgram.account];
        }

        // Normalize Source Names (Early, so stats match history)
        if (source === 'PUMP_AMM' || source === 'PUMP' || source === 'Pump') source = 'Pump.fun';
        if (source === 'JUPITER') source = 'Jupiter';
        if (source === 'RAYDIUM') source = 'Raydium';
        if (source === 'ORCA') source = 'Orca';

        // Track platform usage
        platformUsage[source] = (platformUsage[source] || 0) + 1;

        // --- 2. Track Token PnL / Balances ---
        if (tx.tokenTransfers) {
            tx.tokenTransfers.forEach(t => {
                if (!tokenStats[t.mint]) tokenStats[t.mint] = { bought: 0, sold: 0, balance: 0 };
                const amount = t.tokenAmount;

                if (t.toUserAccount === walletAddress) {
                    tokenStats[t.mint].balance += amount;
                    tokenStats[t.mint].bought += amount;
                } else if (t.fromUserAccount === walletAddress) {
                    tokenStats[t.mint].balance -= amount;
                    tokenStats[t.mint].sold += amount;
                }
            });
        }

        // --- 3. Determine Human-Readable Type ---
        let type = tx.type;
        let description = tx.description || "";

        if (type === 'SWAP') {
            // Try to refine swap description if Helius provided generic one
            // Ideally we'd parse the token transfers to say "Swap X for Y"
            // But Helius description is usually good
        } else if (type === 'TRANSFER') {
            const isSender = tx.nativeTransfers?.some(t => t.fromUserAccount === walletAddress);
            type = isSender ? 'SEND' : 'RECEIVE';
        }

        if (tx.events.nft) type = 'NFT_EVENT';

        const date = new Date(tx.timestamp * 1000).toLocaleString();

        history.push({
            signature: tx.signature,
            date: date,
            timestamp: tx.timestamp,
            type,
            source,
            fee,
            description,
            // Add raw transfers for frontend inspection if needed
            tokenTransfers: tx.tokenTransfers,
            nativeTransfers: tx.nativeTransfers
        });
    });

    return {
        history,
        platformUsage,
        tokenStats
    };
};

module.exports = { parseTransactions };
