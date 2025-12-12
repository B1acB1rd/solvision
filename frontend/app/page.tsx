'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Search, Shield, Wallet, ArrowRightLeft,
  TrendingUp, Activity, ExternalLink, AlertTriangle, Flame, Share2, Camera
} from 'lucide-react';
import html2canvas from 'html2canvas';

// --- Types ---
interface WalletData {
  summary: {
    netWorthUSD: string;
    totalFeesSOL: string;
    totalTx: number;
    mostUsedPlatform: string;
  };
  platforms: Record<string, number>;
  portfolio: {
    mint: string;
    name: string;
    symbol: string;
    image: string;
    balance: number;
    priceUsd: number;
    valueUsd: number;
    totalBought: number;
    totalSold: number;
  }[];
  history: any[];
}

interface RiskData {
  riskScore: number;
  riskLevel: string;
  flags: string[];
  behaviorTags: string[];
  riskyTokens: {
    mint: string;
    name: string;
    image: string;
    reasons: string[];
  }[];
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [data, setData] = useState<WalletData | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Roast & Flex State
  const [roast, setRoast] = useState('');
  const [isRoasting, setIsRoasting] = useState(false);
  const [showFlex, setShowFlex] = useState(false);

  // Watchlist State
  const [savedWallets, setSavedWallets] = useState<string[]>([]);
  const [showWatchlist, setShowWatchlist] = useState(false);

  // Load Watchlist ... (existing useEffect)

  // ... (toggleWatchlist) ...

  const handleRoast = async () => {
    if (!address) return;
    setIsRoasting(true);
    try {
      const res = await axios.get(`${API_BASE}/api/wallet/${address}/roast`);
      setRoast(res.data.roast);
    } catch (e) {
      setRoast("This wallet is too boring to roast. (Error fetching roast)");
    } finally {
      setIsRoasting(false);
    }
  };

  const handleDownloadFlex = async () => {
    const element = document.getElementById('flex-card');
    if (!element) return;
    const canvas = await html2canvas(element, { backgroundColor: null });
    const image = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = image;
    link.download = `solana_vision_${address.slice(0, 6)}.png`;
    link.click();
  };
  useEffect(() => {
    // Load Saved
    const saved = localStorage.getItem('solana_vision_watchlist');
    if (saved) {
      try {
        setSavedWallets(JSON.parse(saved));
      } catch (e) { console.error("Failed to parse watchlist"); }
    }

    // Check URL Param
    const params = new URLSearchParams(window.location.search);
    const urlAddress = params.get('address');
    if (urlAddress) {
      setAddress(urlAddress);
      handleSearch(undefined, urlAddress); // Trigger search
    }
  }, []);

  const toggleWatchlist = (addr: string) => {
    let newSaved;
    if (savedWallets.includes(addr)) {
      newSaved = savedWallets.filter(w => w !== addr);
    } else {
      newSaved = [...savedWallets, addr];
    }
    setSavedWallets(newSaved);
    localStorage.setItem('solana_vision_watchlist', JSON.stringify(newSaved));
  };

  const handleSearch = async (e?: React.FormEvent, overrideAddress?: string) => {
    if (e) e.preventDefault();
    const targetAddress = overrideAddress || address;
    if (!targetAddress) return;

    if (!overrideAddress) {
      // Update URL without reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('address', targetAddress);
      window.history.pushState({}, '', newUrl);
    }

    setIsLoading(true);
    setError('');
    setData(null);
    setRiskData(null);

    try {
      const res = await axios.get(`${API_BASE}/api/wallet/${targetAddress}/analyze`);
      setData(res.data);

      const riskRes = await axios.get(`${API_BASE}/api/wallet/${targetAddress}/risk`);
      setRiskData(riskRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch wallet data. Please check the address.');
    } finally {
      setIsLoading(false);
    }
  };

  // Chart Data
  const platformChartData = data
    ? Object.keys(data.platforms).map(key => ({
      name: key,
      value: data.platforms[key]
    }))
    : [];

  const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981'];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30">
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-black pointer-events-none" />

      {/* WATCHLIST SIDEBAR TOGGLE */}
      <button
        onClick={() => setShowWatchlist(!showWatchlist)}
        className="fixed top-6 left-6 z-50 p-3 bg-slate-900/80 backdrop-blur border border-white/10 rounded-full hover:bg-white/10 transition-colors"
      >
        <TrendingUp className="w-6 h-6 text-purple-400" />
      </button>

      {/* WATCHLIST DRAWER */}
      <AnimatePresence>
        {showWatchlist && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed top-0 left-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 z-40 p-6 pt-24 shadow-2xl"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Watchlist
            </h3>
            <div className="space-y-3">
              {savedWallets.map(w => (
                <div key={w} className="group relative">
                  <button
                    onClick={() => {
                      setAddress(w);
                      handleSearch(undefined, w);
                      setShowWatchlist(false);
                    }}
                    className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-sm font-mono truncate pr-8"
                  >
                    {w}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleWatchlist(w); }}
                    className="absolute right-2 top-3 text-slate-500 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
              {savedWallets.length === 0 && (
                <div className="text-slate-500 text-sm text-center py-10">
                  No wallets saved yet.<br />Star a wallet to analyze it later!
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative max-w-7xl mx-auto p-6 md:p-8 flex flex-col items-center min-h-screen">

        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex flex-col items-center mb-12 mt-8 text-center"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-indigo-200">
              Solana Vision
            </h1>
          </div>
          <p className="text-slate-400 max-w-md text-lg">
            Professional Analytics & Risk Intelligence for Solana
          </p>
        </motion.header>

        {/* SEARCH INPUT */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-2xl mb-12 relative z-10"
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
            <div className="relative flex items-center bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
              <Search className="ml-4 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Enter Solana Wallet Address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-transparent border-none text-white placeholder-slate-500 px-4 py-3 focus:outline-none focus:ring-0 text-lg"
              />

              {/* STAR BUTTON */}
              {data && (
                <button
                  type="button"
                  onClick={() => toggleWatchlist(data.summary?.mostUsedPlatform ? address : address)}
                  className={`mr-2 p-2 rounded-lg hover:bg-white/10 transition-colors ${savedWallets.includes(address) ? 'text-yellow-400' : 'text-slate-600'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={savedWallets.includes(address) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-medium transition-all hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Analyze"
                )}
              </button>
            </div>
          </form>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-center mt-4 bg-red-500/10 border border-red-500/20 py-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full grid gap-8 z-10"
          >
            {/* ACTION BUTTONS (Share & Roast) */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowFlex(true)}
                className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full font-medium transition-colors border border-white/10"
              >
                <Share2 className="w-4 h-4" />
                Share Flex
              </button>
              <button
                onClick={handleRoast}
                disabled={isRoasting}
                className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-full font-bold transition-colors shadow-lg shadow-orange-900/20"
              >
                <Flame className="w-4 h-4" />
                {isRoasting ? "Roasting..." : "Roast My Wallet"}
              </button>
            </div>

            {/* ROAST DISPLAY */}
            <AnimatePresence>
              {roast && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-2xl text-center max-w-3xl mx-auto"
                >
                  <h4 className="text-orange-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                    <Flame /> AI Roast Protocol <Flame />
                  </h4>
                  <p className="text-xl md:text-2xl font-black text-white italic">
                    "{roast}"
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FLEX CARD MODAL */}
            <AnimatePresence>
              {showFlex && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowFlex(false)}>
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    {/* The Card to Caption */}
                    <div
                      id="flex-card"
                      className="w-[400px] bg-slate-900 rounded-3xl overflow-hidden border border-white/20 shadow-2xl relative"
                    >
                      {/* Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-slate-900 to-black opacity-80" />
                      <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/30 rounded-full blur-3xl" />
                      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/30 rounded-full blur-3xl" />

                      <div className="relative p-8 flex flex-col items-center text-center z-10">
                        <h3 className="text-2xl font-black text-white mb-1">Solana Vision</h3>
                        <p className="text-purple-300 font-mono text-xs mb-8">@{address.slice(0, 4)}...{address.slice(-4)}</p>

                        <div className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-2">Net Worth</div>
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-8">
                          ${data.summary.netWorthUSD}
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full mb-8">
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <div className="text-slate-400 text-xs mb-1">Risk Level</div>
                            <div className={`text-xl font-bold ${riskData?.riskLevel === 'Low' ? 'text-green-400' : 'text-red-400'}`}>
                              {riskData?.riskLevel || "Unknown"}
                            </div>
                          </div>
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <div className="text-slate-400 text-xs mb-1">Top Protocol</div>
                            <div className="text-xl font-bold text-white truncate px-2">
                              {data.summary.mostUsedPlatform !== 'None' ? data.summary.mostUsedPlatform : 'HODL'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                          <Shield className="w-3 h-3" /> Verified by Solana Vision AI
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="mt-6 flex justify-center gap-4">
                      <button
                        onClick={handleDownloadFlex}
                        className="px-6 py-3 bg-white text-black font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
                      >
                        <Camera className="w-5 h-5" /> Download Image
                      </button>
                      <button
                        onClick={() => setShowFlex(false)}
                        className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* KEY METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Net Worth" value={`$${data.summary.netWorthUSD}`} icon={<Wallet className="text-emerald-400" />} delay={0.2} />
              <StatCard label="Fees Paid" value={`${data.summary.totalFeesSOL} SOL`} icon={<TrendingUp className="text-orange-400" />} delay={0.3} />
              <StatCard label="Top Protocol" value={data.summary.mostUsedPlatform} icon={<ArrowRightLeft className="text-purple-400" />} delay={0.5} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* PROTOCOL USAGE */}
              <GlassCard className="col-span-1 flex flex-col">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                  Protocol Usage
                </h3>

                <div className="flex-1 min-h-[300px] flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={platformChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        {platformChartData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="mt-6 space-y-3 px-2">
                    {platformChartData.sort((a, b) => b.value - a.value).slice(0, 5).map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length] }} />
                          <span className="text-slate-300 font-medium">{p.name}</span>
                        </div>
                        <span className="font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* PORTFOLIO */}
              <GlassCard className="col-span-1 lg:col-span-2 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    Portfolio
                  </h3>
                  <span className="text-xs font-mono text-slate-500 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                    Live Prices
                  </span>
                </div>

                <div className="overflow-auto max-h-[400px] pr-2 custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="text-xs uppercase text-slate-500 sticky top-0 bg-[#0B0F19] z-10">
                      <tr>
                        <th className="py-3 pl-2">Asset</th>
                        <th>Balance</th>
                        <th>Price</th>
                        <th>Value</th>
                        <th>Flow (Est)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.portfolio.map((token: any) => (
                        <tr key={token.mint} className="group hover:bg-white/5 transition-colors">
                          <td className="py-4 pl-2">
                            <div className="flex items-center gap-3">
                              {token.image ? (
                                <img src={token.image} alt={token.symbol} className="w-10 h-10 rounded-full bg-slate-800" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                  {token.symbol?.[0] || "?"}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-200">{token.name}</div>
                                <div className="text-xs text-slate-500 font-mono">{token.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 font-mono text-slate-300">{token.balance.toLocaleString()}</td>
                          <td className="py-4 text-slate-400">${token.priceUsd.toFixed(4)}</td>
                          <td className="py-4 font-bold text-emerald-400 text-lg">${token.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="py-4">
                            {token.totalBought > 0 || token.totalSold > 0 ? (
                              <div className="flex flex-col gap-1 text-xs">
                                <span className="text-green-400/80">+{token.totalBought.toFixed(2)}</span>
                                <span className="text-red-400/80">-{token.totalSold.toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>

            {/* RISK & HISTORY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* RISK ANALYSIS */}
              {riskData && (
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Shield className="w-32 h-32" />
                  </div>

                  <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 relative z-10">
                    <Shield className={`w-5 h-5 ${riskData.riskLevel === 'Low' ? 'text-green-400' : 'text-red-400'}`} />
                    Risk Analysis
                  </h3>

                  <div className="flex items-center gap-8 mb-8 relative z-10">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="#1e293b" strokeWidth="12" fill="none" />
                        <circle
                          cx="64" cy="64" r="56"
                          stroke={riskData.riskScore > 80 ? "#22c55e" : "#ef4444"}
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={351}
                          strokeDashoffset={351 - (351 * riskData.riskScore) / 100}
                          className="transition-all duration-1000 ease-out"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-3xl font-bold text-white">{riskData.riskScore}</span>
                      </div>
                    </div>

                    <div>
                      <div className={`text-sm font-bold uppercase tracking-wider mb-1 ${riskData.riskLevel === 'Low' ? 'text-green-400' :
                        riskData.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                        {riskData.riskLevel} Risk Profile
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {riskData.behaviorTags?.map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-slate-400 text-sm mt-2">
                        {riskData.flags.length} potential flags detected
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 relative z-10">
                    {riskData.flags.map((flag, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-400 bg-white/5 px-3 py-2 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                        {flag}
                      </div>
                    ))}
                    {riskData.riskyTokens.map(token => (
                      <div key={token.mint} className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-red-200 text-sm">{token.name}</div>
                          <div className="text-xs text-red-300 mt-1">{token.reasons.join(', ')}</div>
                        </div>
                      </div>
                    ))}
                    {riskData.riskyTokens.length === 0 && (
                      <div className="text-center py-6 text-slate-500 bg-white/5 rounded-xl border border-white/5">
                        No high-risk assets detected.
                      </div>
                    )}
                  </div>
                </GlassCard>
              )}

              {/* RECENT ACTIVITY */}
              <GlassCard>
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Recent Activity
                </h3>

                <div className="space-y-2 overflow-auto max-h-[400px] pr-2 custom-scrollbar">
                  {data.history.slice(0, 20).map((tx: any) => {
                    let typeColor = 'text-slate-400 bg-slate-500/10';
                    let icon = <Activity className="w-4 h-4" />;

                    if (tx.type === 'SWAP') {
                      typeColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
                      icon = <ArrowRightLeft className="w-4 h-4" />;
                    } else if (tx.type === 'SEND') {
                      typeColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
                      icon = <ExternalLink className="w-4 h-4" />;
                    } else if (tx.type === 'RECEIVE') {
                      typeColor = 'text-green-400 bg-green-500/10 border-green-500/20';
                      icon = <Wallet className="w-4 h-4" />;
                    }

                    return (
                      <div key={tx.signature} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${typeColor}`}>
                            {icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${typeColor}`}>
                                {tx.type}
                              </span>
                              <span className="text-xs font-mono text-slate-500">{tx.source}</span>
                            </div>
                            <div className="text-sm text-slate-300 mt-1 line-clamp-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              {tx.description}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{tx.date}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono text-slate-500">Fee</div>
                          <div className="text-sm font-mono text-slate-300">{tx.fee.toFixed(5)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

// --- Components ---

function GlassCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

function StatCard({ label, value, icon, delay }: { label: string, value: any, icon: any, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</span>
        <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-black text-slate-100 mt-1 truncate">
        {value}
      </div>
    </motion.div>
  );
}
