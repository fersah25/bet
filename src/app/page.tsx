'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// --- Types ---
interface Candidate {
  id: string; // UUID from Supabase
  name: string;
  initials: string;
  color: string;
  pool: number; // mapped from pool_amount
  image_url: string;
}

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTrading, setIsTrading] = useState<boolean>(false);

  // Fetch Data
  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      let { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('id', { ascending: true });

      if (error) console.error('Error fetching candidates:', error);

      if (data) {
        const mappedCandidates: Candidate[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          initials: item.initials,
          color: item.color,
          pool: item.pool_amount || 10,
          image_url: item.image_url || '',
        }));

        setCandidates(mappedCandidates);

        if (!selectedCandidateId && mappedCandidates.length > 0) {
          setSelectedCandidateId(mappedCandidates[0].id);
        }
      }

    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived Calculations
  const totalPool = candidates.reduce((sum, c) => sum + c.pool, 0);

  const getCandidateStats = (c: Candidate) => {
    const probability = totalPool > 0 ? c.pool / totalPool : 0;
    const probabilityPercent = probability * 100;
    const multiplier = c.pool > 0 ? totalPool / c.pool : 0;

    return { probability, probabilityPercent, multiplier };
  };

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];
  const selectedStats = selectedCandidate ? getCandidateStats(selectedCandidate) : { probability: 0, probabilityPercent: 0, multiplier: 0 };

  // Estimates
  const amountNum = parseFloat(amount) || 0;
  const projectedTotal = totalPool + amountNum;
  const projectedPool = (selectedCandidate?.pool || 0) + amountNum;
  const projectedMultiplier = projectedPool > 0 ? projectedTotal / projectedPool : 0;
  const estimatedPayout = (amountNum * projectedMultiplier).toFixed(2);


  const handleTrade = async () => {
    if (!amount || isNaN(parseFloat(amount)) || !selectedCandidate) return;
    setIsTrading(true);
    const tradeAmount = parseFloat(amount);

    try {
      const newPoolAmount = selectedCandidate.pool + tradeAmount;

      const { error } = await supabase
        .from('markets')
        .update({ pool_amount: newPoolAmount })
        .eq('id', selectedCandidate.id);

      if (error) throw error;

      // Optimistic Update
      const newCandidates = candidates.map(c =>
        c.id === selectedCandidate.id ? { ...c, pool: newPoolAmount } : c
      );
      setCandidates(newCandidates);

      setAmount('');

    } catch (err) {
      console.error('Trade failed:', err);
      alert('Trade failed. check console.');
    } finally {
      setIsTrading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#00d395] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading Markets...</p>
        </div>
      </div>
    )
  }

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

          {/* Left Column: Market Info & Clean Placeholder */}
          <div className="lg:col-span-2 space-y-8">

            {/* Header */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Economics</span>
                <span className="text-gray-400 text-sm">• Vol ${totalPool.toFixed(0)}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                Who will Trump nominate as Fed Chair?
              </h1>
            </div>

            {/* Marker Analysis Placeholder (Replaced Chart) */}
            <div className="h-64 w-full bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center p-6">
              <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Chart coming soon</h3>
              <p className="text-sm text-gray-500 max-w-xs mt-1">
                Historical data is being collected. Check back later for trends.
              </p>
            </div>

            {/* Candidates List */}
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Candidates</h3>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:block">Prediction</div>
              </div>

              {candidates.map((candidate) => {
                const { probabilityPercent, multiplier } = getCandidateStats(candidate);
                return (
                  <div
                    key={candidate.id}
                    className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${selectedCandidateId === candidate.id
                      ? 'bg-blue-50/30 border-blue-200 ring-1 ring-blue-100'
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                      }`}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                  >
                    {/* Info with Image */}
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      {candidate.image_url ? (
                        <img
                          src={candidate.image_url}
                          alt={candidate.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md bg-gray-100"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-md relative"
                          style={{ backgroundColor: candidate.color }}
                        >
                          {candidate.initials}
                        </div>
                      )}

                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{candidate.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-2xl font-bold text-gray-900">{probabilityPercent.toFixed(1)}%</span>
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {multiplier.toFixed(2)}x
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      className={`sm:w-32 py-2.5 rounded-lg font-bold text-sm border transition-all ${selectedCandidateId === candidate.id
                        ? 'bg-[#00d395] text-white border-[#00d395] shadow-md shadow-emerald-200'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      {selectedCandidateId === candidate.id ? 'Selected' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Trade Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 overflow-hidden text-sm">
                {selectedCandidate ? (
                  <>
                    {/* Panel Header */}
                    <div className="bg-gray-50/50 p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Ticket</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {selectedCandidate.image_url && (
                          <img
                            src={selectedCandidate.image_url}
                            alt={selectedCandidate.name}
                            className="w-8 h-8 rounded-full object-cover border border-white shadow-sm bg-gray-100"
                          />
                        )}
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">
                          Buy <span className="text-gray-900">{selectedCandidate.name}</span>
                        </h2>
                      </div>
                    </div>

                    <div className="p-5 space-y-6">

                      {/* Selected Info */}
                      <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCandidate.color }}></span>
                          <span className="font-semibold text-gray-600">Current Odds</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900">{selectedStats.multiplier.toFixed(2)}x</span>
                        </div>
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
                      <div className="space-y-2 pt-2 pb-2 text-gray-600">
                        <div className="flex justify-between">
                          <span>Total Pool</span>
                          <span className="font-medium text-gray-900">{totalPool.toFixed(0)} pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. New Multiplier</span>
                          <span className="font-medium text-blue-600">{projectedMultiplier.toFixed(2)}x</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-100">
                          <span>Est. Payout</span>
                          <span className="font-bold text-emerald-600">${estimatedPayout}</span>
                        </div>
                      </div>

                      {/* Trade Button */}
                      <button
                        onClick={handleTrade}
                        className={`w-full py-4 text-white font-bold text-lg rounded-xl shadow-lg transition-all active:scale-[0.98] ${amount && !isTrading ? 'bg-[#00d395] hover:bg-[#00c087] shadow-emerald-500/20' : 'bg-gray-300 cursor-not-allowed shadow-none'
                          }`}
                        disabled={!amount || isTrading}
                      >
                        {isTrading ? 'Processing...' : 'Place Order'}
                      </button>

                      <p className="text-center text-[10px] text-gray-400 leading-tight">
                        Pari-mutuel logic active. <br /> Your bet adjusts odds for everyone.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-gray-400">Select a candidate to trade</div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}