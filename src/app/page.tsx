'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import BettingWidget, { Candidate } from '@/components/BettingWidget';

const CONTRACT_ADDRESS_FED = '0xEd4F79F27C4C44184F61F349d968C2D2E08108e9';

export default function EconomicsHub() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
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
        .eq('category', 'fed')
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
        setCandidates(mappedCandidates);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTradeAction = async (candidateId: string, tradeAmount: number) => {
    const candidate = candidates.find((c) => c.id === candidateId);
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

  const handleRestartAction = async () => {
    try {
      for (const candidate of candidates) {
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
      <div className="min-h-screen flex items-center justify-center bg-white border-t border-gray-100">
        <Navbar />
        <div className="flex flex-col items-center justify-center absolute inset-0 pt-16">
          <div className="w-8 h-8 border-4 border-[#00d395] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium mt-4">Loading Markets...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <div className="flex flex-col h-full space-y-6">
            <BettingWidget
              title="Who will Trump nominate as Fed Chair?"
              description="Predict the next Fed Chairman. The total pool will be distributed equally among the winning wallets when the market resolves."
              category="Economics"
              contractAddress={CONTRACT_ADDRESS_FED}
              initialCandidates={candidates}
              onTradeAction={handleTradeAction}
              onRestartAction={handleRestartAction}
              allowAdminPanel={true}
            />
          </div>
        </div>
      </div>
    </main>
  );
}