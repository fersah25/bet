'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useChainId, useSwitchChain, useSendTransaction } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { parseEther } from 'viem';
import Navbar from '@/components/Navbar';

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

  // Wallet Hooks
  const { open } = useAppKit();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();

  // Fetch Data
  useEffect(() => {
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      // Strictly fetch from Supabase, no seeds
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching candidates:', error);
        // Don't crash, just log
      }

      if (data && Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedCandidates: Candidate[] = data.map((item: any) => ({
          id: item?.id || 'unknown', // Fallback ID
          name: item?.candidate_name || item?.name || 'Unknown Candidate',
          initials: item?.initials || '??',
          color: item?.color || '#cccccc',
          pool: Number(item?.pool_amount) || 10, // Ensure number
          image_url: item?.image_url || '',
        }));

        // Filter out any potential invalid entries if necessary, though simplistic map is usually fine
        setCandidates(mappedCandidates);

        if (!selectedCandidateId && mappedCandidates.length > 0) {
          setSelectedCandidateId(mappedCandidates[0].id);
        }
      } else {
        setCandidates([]); // Ensure empty array if data is null
      }

    } catch (err) {
      console.error('Unexpected error:', err);
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived Calculations - Safe checks
  const totalPool = candidates?.reduce((sum, c) => sum + (c?.pool || 0), 0) || 0;

  const getCandidateStats = (c: Candidate | undefined) => {
    if (!c) return { probability: 0, probabilityPercent: 0, multiplier: 0 };
    const pool = c.pool || 0;
    const probability = totalPool > 0 ? pool / totalPool : 0;
    const probabilityPercent = probability * 100;
    const multiplier = pool > 0 ? totalPool / pool : 0;

    return { probability, probabilityPercent, multiplier };
  };

  const selectedCandidate = candidates?.find((c) => c.id === selectedCandidateId) || (candidates && candidates.length > 0 ? candidates[0] : null);
  const selectedStats = getCandidateStats(selectedCandidate || undefined);

  // Estimates
  const amountNum = parseFloat(amount) || 0;
  const projectedTotal = totalPool + amountNum;
  const projectedPool = (selectedCandidate?.pool || 0) + amountNum;
  const projectedMultiplier = projectedPool > 0 ? projectedTotal / projectedPool : 0;
  const estimatedPayout = (amountNum * projectedMultiplier).toFixed(2);


  const handleTrade = async () => {
    if (!amount || isNaN(parseFloat(amount)) || !selectedCandidate) return;
    setIsTrading(true);

    try {
      // 1. Send Dummy Transaction
      const hash = await sendTransactionAsync({
        to: '0x000000000000000000000000000000000000dead',
        value: parseEther('0.0001'),
      });

      console.log('Transaction sent:', hash);

      // 2. Update Supabase (Logic remains the same for now)
      const currentPool = selectedCandidate.pool || 0;
      const tradeAmount = parseFloat(amount);
      const newPoolAmount = currentPool + tradeAmount;

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
      alert('Order Placed Successfully! Tx Hash: ' + hash.slice(0, 10) + '...');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Trade failed:', err);
      // Handle User Rejected
      if (err.shortMessage) {
        alert('Trade failed: ' + err.shortMessage);
      } else {
        alert('Trade failed. Please try again.');
      }
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

  // Button Logic Helper
  const renderTradeButton = () => {
    if (!isConnected) {
      return (
        <button
          onClick={() => open()}
          className="w-full py-4 bg-gray-900 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:bg-gray-800"
        >
          Connect Wallet
        </button>
      )
    }

    if (chainId !== baseSepolia.id) {
      return (
        <button
          onClick={() => switchChain({ chainId: baseSepolia.id })}
          className="w-full py-4 bg-yellow-500 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:bg-yellow-600"
        >
          Switch to Base Sepolia
        </button>
      )
    }

    return (
      <button
        onClick={handleTrade}
        className={`w-full py-4 text-white font-bold text-lg rounded-xl shadow-lg transition-all active:scale-[0.98] ${amount && !isTrading ? 'bg-[#00d395] hover:bg-[#00c087] shadow-emerald-500/20' : 'bg-gray-300 cursor-not-allowed shadow-none'
          }`}
        disabled={!amount || isTrading}
      >
        {isTrading ? 'Processing...' : 'Place Order'}
      </button>
    )
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Navbar */}
      {/* Navbar */}
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Left Column: Market Info & List */}
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

            {/* CHART REMOVED AS REQUESTED - CLEAN SLATE */}

            {/* Candidates List - Clean & Robust */}
            <div className="space-y-3">
              <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Candidates</h3>
              </div>

              {candidates && candidates.length > 0 ? (
                candidates.map((candidate) => {
                  const { probabilityPercent, multiplier } = getCandidateStats(candidate);
                  return (
                    <div
                      key={candidate?.id || Math.random()}
                      className={`group flex flex-row items-center p-3 rounded-xl border transition-all cursor-pointer ${selectedCandidateId === candidate?.id
                        ? 'bg-blue-50/30 border-blue-200 ring-1 ring-blue-100'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                        }`}
                      onClick={() => candidate?.id && setSelectedCandidateId(candidate.id)}
                    >
                      {/* 1. Photo (or Fallback) */}
                      {candidate?.image_url ? (
                        <img
                          src={candidate.image_url}
                          alt={candidate.name || 'Candidate'}
                          className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm shrink-0 bg-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}

                      {/* Fallback */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold text-sm shrink-0 ${candidate?.image_url ? 'hidden' : ''}`}
                        style={!candidate?.image_url && candidate?.color ? { backgroundColor: candidate.color, color: 'white' } : {}}
                      >
                        {(candidate?.name || '?').charAt(0)}
                      </div>

                      {/* 2. Name */}
                      <div className="ml-4 flex-1">
                        <h4 className="font-bold text-gray-900 text-sm md:text-base">{candidate?.name || 'Unknown'}</h4>
                      </div>

                      {/* 3. Percentage */}
                      <div className="text-right mx-4 min-w-[60px]">
                        <span className="block font-bold text-gray-900 text-lg">{probabilityPercent.toFixed(0)}%</span>
                      </div>

                      {/* 4. Multiplier */}
                      <div className="text-right mr-4 min-w-[50px] hidden sm:block">
                        <span className="text-sm font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {multiplier.toFixed(2)}x
                        </span>
                      </div>

                      {/* 5. Select Button */}
                      <button
                        className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm border transition-all ${selectedCandidateId === candidate?.id
                          ? 'bg-[#00d395] text-white border-[#00d395] shadow-sm'
                          : 'bg-white text-gray-400 border-gray-200 group-hover:border-gray-300'
                          }`}
                      >
                        {selectedCandidateId === candidate?.id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No candidates found.
                </div>
              )}
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
                        {selectedCandidate.image_url ? (
                          <img
                            src={selectedCandidate.image_url}
                            alt={selectedCandidate.name}
                            className="w-10 h-10 rounded-full object-cover border border-white shadow-sm bg-gray-100"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}

                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold text-sm shrink-0 border border-white shadow-sm ${selectedCandidate.image_url ? 'hidden' : ''}`}
                          style={!selectedCandidate.image_url && selectedCandidate.color ? { backgroundColor: selectedCandidate.color, color: 'white' } : {}}
                        >
                          {(selectedCandidate.name || '?').charAt(0)}
                        </div>

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

                      {/* Trade Button (Dynamic) */}
                      {renderTradeButton()}

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