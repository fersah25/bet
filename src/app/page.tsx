'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import BettingWidget, { Candidate } from '@/components/BettingWidget';

const CONTRACT_ADDRESS_FED = '0xd10Ab59c208914BEd5209f5904859D954e9903ea';
const CONTRACT_ADDRESS_BTC = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BTC || '0xd10Ab59c208914BEd5209f5904859D954e9903eb'; // fallback if env is missing

const BTC_CANDIDATES: Candidate[] = [
  { id: 'yes', name: 'Yes', initials: 'Y', color: '#00d395', pool: 0 },
  { id: 'no', name: 'No', initials: 'N', color: '#ff4d4d', pool: 0 }
];

export default function Home() {
  const [fedCandidates, setFedCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchFedCandidates();
  }, []);

  const fetchFedCandidates = async () => {
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
        const mappedCandidates: Candidate[] = data.map((item: any) => ({
          id: item?.id || 'unknown',
          name: item?.candidate_name || item?.name || 'Unknown Candidate',
          initials: item?.initials || '??',
          color: item?.color || '#cccccc',
          pool: Number(item?.pool_amount) || 0,
          image_url: item?.image_url || '',
        }));
        setFedCandidates(mappedCandidates);
      } else {
        setFedCandidates([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setFedCandidates([]);
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
              allowAdminPanel={true}
            />
          </div>

          {/* Right Column: Bitcoin Market + TradingView */}
          <div className="flex flex-col h-full space-y-6">

            {/* TradingView Widget */}
            <div className="w-full h-[300px] md:h-[400px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <iframe
                title="TradingView: BTCUSDT"
                src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_btc&symbol=BINANCE%3ABTCUSDT&interval=D&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=light&style=1&timezone=Etc%2FUTC"
                style={{ width: '100%', height: '100%' }}
                frameBorder="0"
                allowTransparency={true}
                scrolling="no"
                allowFullScreen={true}
              ></iframe>
            </div>

            <BettingWidget
              title="Will Bitcoin reach $75k in 24 hours?"
              description="Will BTC hit the target price within 24 hours? Place your bets on Yes or No. The winning side takes the entire pool!"
              category="Crypto"
              contractAddress={CONTRACT_ADDRESS_BTC}
              initialCandidates={BTC_CANDIDATES}
              allowAdminPanel={true}
            />

          </div>
        </div>
      </div>
    </main>
  );
}