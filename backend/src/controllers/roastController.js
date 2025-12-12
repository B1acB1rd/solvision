const { fetchAssets, fetchTransactions } = require('../services/helius');
const { fetchTokenPrices } = require('../services/price');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const generateRoast = async (req, res) => {
    try {
        const { address } = req.params;
        const [assetsData, transactions] = await Promise.all([
            fetchAssets(address),
            fetchTransactions(address, 50)
        ]);

        const assets = assetsData.items;
        const nativeBalance = assetsData.nativeBalance || 0;

        // Fetch SOL Price for accurate Net Worth
        const SOL_MINT = "So11111111111111111111111111111111111111112";
        const priceMap = await fetchTokenPrices([SOL_MINT]);
        const solPrice = priceMap[SOL_MINT]?.price ? parseFloat(priceMap[SOL_MINT].price) : 0;

        let tokenTotal = assets.reduce((acc, a) => acc + (a.token_info?.price_info?.total_price || 0), 0);

        const solValue = nativeBalance * solPrice;
        const netWorth = tokenTotal + solValue;

        // Prepare context for AI
        const topTokens = assets.slice(0, 5).map(a =>
            `${a.content?.metadata?.name || 'Unknown'} ($${(a.token_info?.price_info?.total_price || 0).toFixed(2)})`
        ).join(', ');

        const txCount = transactions.length;
        const recentActivity = transactions.map(t => t.type).slice(0, 10).join(', ');

        // --- GEMINI AI ROAST ---
        if (process.env.GEMINI_API_KEY) {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                const prompt = `You are a rude, cynical, but funny crypto degen roasting a Solana wallet.
    Stats:
- Net Worth: approx $${netWorth.toFixed(2)} (SOL Balance: ${nativeBalance.toFixed(2)} SOL)
- Top Holdings: ${topTokens}
- Recent Moves: ${recentActivity} (Total ${txCount} txs fetched)
                
                Roast this user in 2 sentences max.Be brutal but entertaining.Focus on their bag(if it's trash) or their activity.`;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                return res.json({ roast: text });
            } catch (aiError) {
                console.error("Gemini API Error:", aiError.message);
                // Fallback to heuristic below if AI fails
            }
        }

        // --- HEURISTIC FALLBACK (If no Key or Error) ---
        const memecoins = assets.filter(a => a.content?.metadata?.name?.toLowerCase().match(/(dog|cat|pepe|wif|bonk|pump)/));
        let roast = "Let's look at this disaster...";

        if (netWorth < 10) roast += " Your wallet has less value than a gas station sushi. Are you even trying? ";
        else if (netWorth < 100) roast += ` $${netWorth.toFixed(2)}? Cute. Maybe spend less time on Twitter and more time working. `;
        else if (netWorth > 100000) roast += " Oh look, a whale. Or just someone who got lucky on one mint and thinks they're Warren Buffet. ";

        if (memecoins.length > 5) roast += " I detect a dangerous amount of dog coins. You know 'Utility' isn't a dirty word, right? ";

        res.json({ roast });

    } catch (error) {
        console.error("Roast Controller Error:", error);
        res.status(500).json({ error: "Roast machine broken. You broke it." });
    }
};

module.exports = { generateRoast };
