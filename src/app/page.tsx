'use client';

import { useState, useEffect } from 'react';

// --- Types ---
interface Candidate {
  id: string;
  name: string;
  initials: string;
  prices: { yes: number; no: number };
  yesPool: number;
  noPool: number;
  priceHistory: number[]; // Array of history for the 'yes' price (0-1)
}

// --- Mock Initial Data ---
const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    name: 'Kevin Warsh',
    initials: 'KW',
    yesPool: 9500,
    noPool: 500,
    prices: { yes: 0.95, no: 0.05 },
    priceHistory: [0.88, 0.89, 0.92, 0.91, 0.94, 0.95],
  },
  {
    id: 'c2',
    name: 'Judy Shelton',
    initials: 'JS',
    yesPool: 400,
    noPool: 9600,
    prices: { yes: 0.04, no: 0.96 },
    priceHistory: [0.08, 0.07, 0.05, 0.06, 0.05, 0.04],
  },
  {
    id: 'c3',
    name: 'Rick Rieder',
    initials: 'RR',
    yesPool: 100,
    noPool: 9900,
    prices: { yes: 0.01, no: 0.99 },
    priceHistory: [0.03, 0.02, 0.02, 0.01, 0.01, 0.01],
  },
];

// --- Components ---

const DynamicLineChart = ({ data, color }: { data: number[]; color: string }) => {
  if (!data || data.length < 2) return null;

  const width = 100;
  const height = 40;
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.1;
  const range = max - min || 1;

  // Create points for the SVG polyline
  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">

      {/* Gradient Defs */}
      <defs>
        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area Fill (Close the loop for fill) */}
      <path
        d={`${points} L${width},${height} L0,${height} Z`}
        fill="url(#chartGradient)"
        stroke="none"
      />

      {/* The Line */}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(INITIAL_CANDIDATES[0].id); // Use the constant for initial ref? No, use string.
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState<string>('');

  // Derived state from the functional state
  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];
  const currentPrice = selectedSide === 'yes' ? selectedCandidate.prices.yes : selectedCandidate.prices.no;
  const priceDisplay = Math.round(currentPrice * 100);

  // Calculate est. returns
  const estShares = amount ? (parseFloat(amount) / currentPrice).toFixed(2) : '0.00';
  const payout = amount ? (parseFloat(estShares) * 1.00).toFixed(2) : '0.00';

  const handleSelect = (candidateId: string, side: 'yes' | 'no') => {
    setSelectedCandidateId(candidateId);
    setSelectedSide(side);
    setAmount(''); // Reset input on switch
  };

  const handleTrade = () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    const tradeAmount = parseFloat(amount);

    setCandidates((prevCandidates) =>
      prevCandidates.map((c) => {
        if (c.id === selectedCandidateId) {
          // Simulation Logic:
          // 1. Update Pools
          const newYesPool = selectedSide === 'yes' ? c.yesPool + tradeAmount : c.yesPool;
          const newNoPool = selectedSide === 'no' ? c.noPool + tradeAmount : c.noPool;

          // 2. Calculate New Price (AMM-ish: p = yes / (yes + no))
          // For 'No' price it is 1 - YesPrice
          const totalPool = newYesPool + newNoPool;
          const newYesPrice = newYesPool / totalPool;
          const newNoPrice = 1 - newYesPrice;

          // 3. Update History
          // We only track the 'YES' price history for the chart for simplicity
          const newHistory = [...c.priceHistory, newYesPrice];

          return {
            ...c,
            yesPool: newYesPool,
            noPool: newNoPool,
            prices: { yes: newYesPrice, no: newNoPrice },
            priceHistory: newHistory,
          };
        }
        return c;
      })
    );

    // Optional: Visual feedback or toast could go here
    setAmount('');
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <div className="bg-[#00d395] text-white font-bold px-2 py-1 rounded text-lg">K</div>
          <span className="text-xl font-bold tracking-tight text-gray-900">KalshiClone</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm font-semibold text-gray-500 hover:text-gray-900">Log in</button>
          <button className="text-sm font-semibold bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">Sign up</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Left Column: Market Info & Candidates */}
          <div className="lg:col-span-2 space-y-8">

            {/* Header */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Economics</span>
                <span className="text-gray-400 text-sm">• Vol $12.4M</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                Who will Trump nominate as Fed Chair?
              </h1>
            </div>

            {/* Dynamic Chart Container */}
            <div className="h-64 w-full bg-gray-50 rounded-xl border border-gray-100 relative overflow-hidden group p-4">
              <DynamicLineChart
                data={selectedCandidate.priceHistory}
                color="#00d395"
              />
              {/* Overlay Info */}
              <div className="absolute top-4 left-4">
                <p className="text-sm text-gray-500 font-medium">{selectedCandidate.name} (Yes)</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(selectedCandidate.prices.yes * 100)}%</p>
              </div>
            </div>

            {/* Candidates List */}
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Candidates</h3>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:block">Prediction</div>
              </div>

              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${selectedCandidateId === candidate.id
                    ? 'bg-blue-50/30 border-blue-200 ring-1 ring-blue-100'
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  onClick={() => handleSelect(candidate.id, 'yes')}
                >
                  {/* Info */}
                  <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm border-2 border-white shadow-sm">
                      {candidate.initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{candidate.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-emerald-600">{Math.round(candidate.prices.yes * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 sm:w-auto w-full">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelect(candidate.id, 'yes'); }}
                      className={`flex-1 sm:w-28 py-2.5 rounded-lg font-bold text-sm border transition-all ${selectedCandidateId === candidate.id && selectedSide === 'yes'
                        ? 'bg-[#00d395] text-white border-[#00d395] shadow-md shadow-emerald-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                        }`}
                    >
                      <span className="block text-xs font-medium opacity-80 uppercase">Yes</span>
                      <span className="block text-base">{Math.round(candidate.prices.yes * 100)}¢</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelect(candidate.id, 'no'); }}
                      className={`flex-1 sm:w-28 py-2.5 rounded-lg font-bold text-sm border transition-all ${selectedCandidateId === candidate.id && selectedSide === 'no'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200'
                        : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                        }`}
                    >
                      <span className="block text-xs font-medium opacity-80 uppercase">No</span>
                      <span className="block text-base">{Math.round(candidate.prices.no * 100)}¢</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Trade Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 overflow-hidden">

                {/* Panel Header */}
                <div className="bg-gray-50/50 p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Ticket</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    {selectedSide === 'yes' ? 'Buy Yes' : 'Buy No'} <span className="text-gray-400 font-normal">- {selectedCandidate.name}</span>
                  </h2>
                </div>

                <div className="p-5 space-y-6">

                  {/* Outcome Toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedSide('yes')}
                      className={`py-3 rounded-lg border-2 font-bold transition-all ${selectedSide === 'yes'
                        ? 'border-[#00d395] bg-emerald-50 text-emerald-800'
                        : 'border-gray-100 text-gray-400 hover:border-gray-200'
                        }`}
                    >
                      <span className="block text-xs uppercase mb-1">Yes</span>
                      <span className="text-xl">{Math.round(selectedCandidate.prices.yes * 100)}¢</span>
                    </button>
                    <button
                      onClick={() => setSelectedSide('no')}
                      className={`py-3 rounded-lg border-2 font-bold transition-all ${selectedSide === 'no'
                        ? 'border-rose-500 bg-rose-50 text-rose-800'
                        : 'border-gray-100 text-gray-400 hover:border-gray-200'
                        }`}
                    >
                      <span className="block text-xs uppercase mb-1">No</span>
                      <span className="text-xl">{Math.round(selectedCandidate.prices.no * 100)}¢</span>
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) setAmount(val);
                        }}
                        placeholder="0"
                        className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-xl font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00d395] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="space-y-2 pt-2 pb-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Avg Price</span>
                      <span className="font-medium text-gray-900">{priceDisplay}¢</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. Shares</span>
                      <span className="font-medium text-gray-900">{estShares}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-100">
                      <span>Est. Payout</span>
                      <span className="font-bold text-emerald-600">${payout}</span>
                    </div>
                  </div>

                  {/* Trade Button */}
                  <button
                    onClick={handleTrade}
                    className="w-full py-4 bg-[#00d395] hover:bg-[#00c087] text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                  >
                    Place Order
                  </button>

                  <p className="text-center text-[10px] text-gray-400 leading-tight">
                    Simulation Mode. Prices update locally based on your trades.
                  </p>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}