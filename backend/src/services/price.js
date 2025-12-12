const axios = require('axios');

const fetchTokenPrices = async (tokenMints) => {
    if (!tokenMints || tokenMints.length === 0) return {};

    try {
        // Jupiter Price API v3 (Lite/Free)
        // Endpoint: https://lite-api.jup.ag/price/v3/
        const uniqueMints = [...new Set(tokenMints)]
            .filter(m => m && typeof m === 'string' && m.length > 30)
            .slice(0, 99)
            .join(',');

        if (!uniqueMints) return {};

        const url = `https://lite-api.jup.ag/price/v3?ids=${uniqueMints}`;
        console.log(`Fetching prices from: ${url}`); // DEBUG

        const response = await axios.get(url);
        // v3 Response format: { "MINT": { id, type, price, ... } }
        // It returns the map directly, not wrapped in "data" property usually, 
        const data = response.data;

        if (!data) return {};

        const formattedData = {};

        // Jupiter Lite V3 returns a direct map: { "MINT": { usdPrice: 123.45, ... } }
        const entries = data.data || data;

        Object.keys(entries).forEach(mint => {
            const tokenData = entries[mint];
            if (tokenData) {
                // Check for 'price' (v6/v2) OR 'usdPrice' (Lite v3)
                const priceVal = tokenData.price || tokenData.usdPrice;

                if (priceVal !== undefined && priceVal !== null) {
                    formattedData[mint] = {
                        price: priceVal.toString()
                    };
                }
            }
        });

        return formattedData;
    } catch (error) {
        console.error("Price fetch error:", error.response?.status, error.message);
        return {};
    }
};

module.exports = { fetchTokenPrices };
