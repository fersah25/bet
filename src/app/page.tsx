'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import BettingWidget, { Candidate } from '@/components/BettingWidget';
import BitcoinBettingWidget from '@/components/BitcoinBettingWidget';

const CONTRACT_ADDRESS_FED = '0xd10Ab59c208914BEd5209f5904859D954e9903ea';
const CONTRACT_ADDRESS_BTC = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BTC || '0x403B63B2cF2Cf64A029aB903e4099d713fA6924B'; // fallback if env is missing

export default function Home() {
  const [fedCandidates, setFedCandidates] = useState<Candidate[]>([]);
  const [btcCandidates, setBtcCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching candidates:', error);
      }

      if (data && Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedCandidates: (Candidate & { category: string })[] = data.map((item: any) => ({
          id: item?.id || 'unknown',
          name: item?.candidate_name || item?.name || 'Unknown Candidate',
          initials: item?.initials || '??',
          color: item?.color || '#cccccc',
          pool: Number(item?.pool_amount) || 0,
          image_url: item?.image_url || '',
          category: item?.category || 'fed',
        }));

        setFedCandidates(mappedCandidates.filter(c => c.category === 'fed'));
        setBtcCandidates(mappedCandidates.filter(c => c.category === 'bitcoin'));
      } else {
        setFedCandidates([]);
        setBtcCandidates([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setFedCandidates([]);
      setBtcCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFedTradeAction = async (candidateId: string, tradeAmount: number) => {
    const candidate = fedCandidates.find((c) => c.id === candidateId);
    if (!candidate) return;
    const newPoolAmount = (candidate.pool || 0) + tradeAmount;

    try {
      const { error } = await supabase
        .from('markets')
        .update({ pool_amount: newPoolAmount })
        .eq('id', candidateId);

      if (error) console.error('Supabase update error:', error);
    } catch (err) {
      console.error('Supabase update failed:', err);
    }
  };

  const handleBtcTradeAction = async (candidateName: string, tradeAmount: number) => {
    const candidate = btcCandidates.find((c) => c.name === candidateName);
    if (!candidate) return;
    const newPoolAmount = (candidate.pool || 0) + tradeAmount;

    try {
      const { error } = await supabase
        .from('markets')
        .update({ pool_amount: newPoolAmount })
        .eq('id', candidate.id);

      if (error) console.error('Supabase update error:', error);
    } catch (err) {
      console.error('Supabase update failed:', err);
    }
  };

  const handleBtcRestartAction = async () => {
    try {
      const { error } = await supabase.rpc('reset_bitcoin_market');
      if (error) console.error('Supabase btc restart update failed:', error);
    } catch (err) {
      console.error('Supabase restart update failed:', err);
    }
  };

  const handleFedRestartAction = async () => {
    try {
      for (const candidate of fedCandidates) {
        await supabase
          .from('markets')
          .update({ pool_amount: 0 })
          .eq('id', candidate.id);
      }
    } catch (err) {
      console.error('Supabase fed restart update failed:', err);
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
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Left Column: Fed Market */}
          <div className="flex flex-col h-full space-y-6">
            <BettingWidget
              title="Who will Trump nominate as Fed Chair?"
              description="Predict the next Fed Chairman. The total pool will be distributed equally among the winning wallets when the market resolves."
              category="Economics"
              contractAddress={CONTRACT_ADDRESS_FED}
              initialCandidates={fedCandidates}
              onTradeAction={handleFedTradeAction}
              onRestartAction={handleFedRestartAction}
              allowAdminPanel={true}
            />
          </div>

          {/* Right Column: Bitcoin Market */}
          <div className="flex flex-col h-full space-y-6">
            <BitcoinBettingWidget
              contractAddress={CONTRACT_ADDRESS_BTC}
              initialCandidates={btcCandidates}
              onTradeAction={handleBtcTradeAction}
              onRestartAction={handleBtcRestartAction}
            />
          </div>
        </div>
      </div>
    </main>
  );
}