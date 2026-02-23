'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import BettingWidget, { Candidate } from '@/components/BettingWidget';
import BitcoinBettingWidget from '@/components/BitcoinBettingWidget';

const CONTRACT_ADDRESS_BTC = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BTC || '0x403B63B2cF2Cf64A029aB903e4099d713fA6924B';
const CONTRACT_ADDRESS_BASE_TWEET = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE_TWEET || '0x79c68cFf7D9C1274EFc677901239f81e1aba8D3d';
const CONTRACT_ADDRESS_DUBAI_WEATHER = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_DUBAI_WEATHER || '0xcaeD4a39bc69D81675C8dA5D6aC80eC05a2f641d';

export default function CategoryPage() {
    const params = useParams();
    const categoryParam = typeof params?.category === 'string' ? params.category : '';
    const cat = categoryParam.toLowerCase();

    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Map the URL param to the DB category string
    const dbCategoryMap: Record<string, string> = {
        crypto: 'bitcoin',
        social: 'base_tweet',
        weather: 'weather'
    };

    const dbCategory = dbCategoryMap[cat] || cat;

    useEffect(() => {
        fetchCandidates();
    }, [dbCategory]);

    const fetchCandidates = async () => {
        if (!dbCategory) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('markets')
                .select('*')
                .eq('category', dbCategory)
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
                    category: item?.category || '',
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

    const handleTradeAction = async (identifier: string, tradeAmount: number) => {
        const candidate = candidates.find((c) => c.name === identifier);
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

    const handleRestartAction = async () => {
        try {
            if (dbCategory === 'bitcoin') {
                await supabase.rpc('reset_bitcoin_market');
            } else if (dbCategory === 'base_tweet') {
                await supabase.rpc('reset_base_tweet_market');
            } else if (dbCategory === 'weather' || dbCategory === 'dubai_weather') {
                await supabase.rpc('reset_dubai_weather_market');
            }
        } catch (err) {
            console.error(`Supabase restart update failed for ${dbCategory}:`, err);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white border-t border-gray-100">
                <Navbar />
                <div className="flex flex-col items-center justify-center absolute inset-0 pt-16">
                    <div className="w-8 h-8 border-4 border-[#00d395] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium mt-4">Loading Market...</p>
                </div>
            </div>
        );
    }

    let widget = null;

    if (cat === 'crypto') {
        widget = (
            <BitcoinBettingWidget
                contractAddress={CONTRACT_ADDRESS_BTC}
                initialCandidates={candidates}
                onTradeAction={handleTradeAction}
                onRestartAction={handleRestartAction}
                marketName="Bitcoin"
                title="Will Bitcoin reach $75k in 24 hours?"
                description="Predict if BTC will hit the target price. Powered by a secure, audited smart contract."
                categoryLabel="Crypto"
            />
        );
    } else if (cat === 'social') {
        widget = (
            <BitcoinBettingWidget
                contractAddress={CONTRACT_ADDRESS_BASE_TWEET}
                initialCandidates={candidates}
                onTradeAction={handleTradeAction}
                onRestartAction={handleRestartAction}
                marketName="Base Tweet"
                title="@base Today's Tweet Count"
                description="Will @base post 10 or more tweets today? Powered by a secure, audited smart contract."
                categoryLabel="Social"
            />
        );
    } else if (cat === 'weather') {
        widget = (
            <BitcoinBettingWidget
                contractAddress={CONTRACT_ADDRESS_DUBAI_WEATHER}
                initialCandidates={candidates}
                onTradeAction={handleTradeAction}
                onRestartAction={handleRestartAction}
                marketName="Dubai Weather"
                title="Will it rain in Dubai in 3 days?"
                description="Predict if it will rain in Dubai in 3 days. Powered by a secure, audited smart contract."
                categoryLabel="Weather"
            />
        );
    } else {
        widget = (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Category Not Found</h2>
                <p className="text-gray-500">The market category "{categoryParam}" could not be found.</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    <div className="flex flex-col h-full space-y-6">
                        {widget}
                    </div>
                </div>
            </div>
        </main>
    );
}
