const express = require('express');
const router = express.Router();
const { analyzeWallet, getWalletRisk } = require('../controllers/walletController');
const { generateRoast } = require('../controllers/roastController');

router.get('/:address/analyze', analyzeWallet);
router.get('/:address/risk', getWalletRisk);
router.get('/:address/roast', generateRoast);

module.exports = router;
