'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, parseEther, formatEther, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { bitcoinBettingAbi } from '@/constants/bitcoinBettingAbi';
import { Candidate } from './BettingWidget';

const ETH_PRICE = 2000; // Hardcoded ETH Price for Demo conversion

export interface BitcoinBettingWidgetProps {
    contractAddress: string;
    initialCandidates?: Candidate[];
    onTradeAction?: (candidateName: string, amountUSD: number) => Promise<void>;
    onRestartAction?: () => Promise<void>;
}

export default function BitcoinBettingWidget({ contractAddress, initialCandidates = [], onTradeAction, onRestartAction }: BitcoinBettingWidgetProps) {
    const [amount, setAmount] = useState<string>('');
    const [isTrading, setIsTrading] = useState<boolean>(false);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string>('Yes');

    // Contract states
    const [totalPool, setTotalPool] = useState<bigint>(0n);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [marketResolved, setMarketResolved] = useState<boolean>(false);
    const [winningOutcome, setWinningOutcome] = useState<string>('');
    const [contractOwner, setContractOwner] = useState<string | null>(null);
    const [outcomeTotals, setOutcomeTotals] = useState<{ yes: bigint, no: bigint }>({ yes: 0n, no: 0n });

    // User states
    const [userBets, setUserBets] = useState<{ yes: bigint, no: bigint }>({ yes: 0n, no: 0n });
    const [isClaiming, setIsClaiming] = useState<boolean>(false);

    // UI states
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isBettingActive, setIsBettingActive] = useState<boolean>(false);
    const [durationInput, setDurationInput] = useState<string>('60');

    const { login, authenticated } = usePrivy();
    const { wallets } = useWallets();
    const wallet = wallets[0];

    useEffect(() => {
        fetchContractData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contractAddress, wallet]);

    const fetchContractData = async () => {
        try {
            const publicClient = createPublicClient({
                chain: baseSepolia,
                transport: http()
            });

            // Parallelize reads for better performance
            const [
                fetchedOwner,
                fetchedEndTime,
                fetchedMarketResolved,
                fetchedWinningOutcome,
                fetchedTotalPool,
                fetchedYesTotal,
                fetchedNoTotal
            ] = await Promise.all([
                publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: bitcoinBettingAbi,
                    functionName: 'owner',
                }),
                publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: bitcoinBettingAbi,
                    functionName: 'endTime',
                }),
                publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: bitcoinBettingAbi,
                    functionName: 'marketResolved',
                }),
                publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: bitcoinBettingAbi,
                    functionName: 'winningOutcome',
                }),
                publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: bitcoinBettingAbi,
                    functionName: 'totalPool',
                }),
                publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: bitcoinBettingAbi,
                    functionName: 'outcomeTotals',
                    args: ['Yes']
                }),
                publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: bitcoinBettingAbi,
                    functionName: 'outcomeTotals',
                    args: ['No']
                })
            ]);

            setContractOwner((fetchedOwner as string).toLowerCase());
            setEndTime(Number(fetchedEndTime));
            setMarketResolved(fetchedMarketResolved as boolean);
            setWinningOutcome(fetchedWinningOutcome as string);
            setTotalPool(fetchedTotalPool as bigint);
            setOutcomeTotals({
                yes: fetchedYesTotal as bigint,
                no: fetchedNoTotal as bigint
            });

            if (wallet) {
                const [userYesBet, userNoBet] = await Promise.all([
                    publicClient.readContract({
                        address: contractAddress as `0x${string}`,
                        abi: bitcoinBettingAbi,
                        functionName: 'userBets',
                        args: [wallet.address as `0x${string}`, 'Yes']
                    }),
                    publicClient.readContract({
                        address: contractAddress as `0x${string}`,
                        abi: bitcoinBettingAbi,
                        functionName: 'userBets',
                        args: [wallet.address as `0x${string}`, 'No']
                    })
                ]);
                setUserBets({
                    yes: userYesBet as bigint,
                    no: userNoBet as bigint
                });
            } else {
                setUserBets({ yes: 0n, no: 0n });
            }

        } catch (err) {
            console.error('Error fetching Bitcoin contract data:', err);
        }
    };

    useEffect(() => {
        if (endTime === null) return;

        if (endTime === 0) {
            setTimeLeft('Market Pending');
            setIsBettingActive(false);
            return;
        }

        const updateTimer = () => {
            const now = Math.floor(Date.now() / 1000);
            const diff = endTime - now;

            if (diff <= 0) {
                setTimeLeft('Betting Closed');
                setIsBettingActive(false);
                return false;
            } else {
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                const s = diff % 60;

                if (h > 0) {
                    setTimeLeft(`${h}h ${m.toString().padStart(2, '0')}m`);
                } else {
                    setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
                }
                setIsBettingActive(true);
                return true;
            }
        };

        updateTimer();
        const interval = setInterval(() => {
            if (!updateTimer()) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    const handleStartBetting = async () => {
        if (!wallet) return;
        try {
            const provider = await wallet.getEthereumProvider();
            const walletClient = createWalletClient({
                chain: baseSepolia,
                transport: custom(provider),
            });
            const [address] = await walletClient.getAddresses();

            const hash = await walletClient.writeContract({
                address: contractAddress as `0x${string}`,
                abi: bitcoinBettingAbi,
                functionName: 'startBetting',
                args: [BigInt(durationInput)],
                account: address,
                chain: baseSepolia,
            });

            alert(`Betting Started / Restarted! Tx Hash: ${hash.slice(0, 10)}...`);
            setMarketResolved(false);
            setWinningOutcome('');
            if (onRestartAction) {
                await onRestartAction();
            }
            setTimeout(fetchContractData, 5000);
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error(err);
            alert('Failed to start betting: ' + (err.shortMessage || err.message));
        }
    };

    const handleResolveMarket = async (outcome: string) => {
        if (!wallet) return;
        try {
            const provider = await wallet.getEthereumProvider();
            const walletClient = createWalletClient({
                chain: baseSepolia,
                transport: custom(provider),
            });
            const [address] = await walletClient.getAddresses();

            const hash = await walletClient.writeContract({
                address: contractAddress as `0x${string}`,
                abi: bitcoinBettingAbi,
                functionName: 'resolveMarket',
                args: [outcome],
                account: address,
                chain: baseSepolia,
            });

            alert(`Market Resolved to ${outcome}! Tx Hash: ${hash.slice(0, 10)}...`);
            setTimeout(fetchContractData, 5000);
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error(err);
            alert('Failed to resolve market: ' + (err.shortMessage || err.message));
        }
    };

    const handleTrade = async () => {
        if (!amount || isNaN(parseFloat(amount))) return;
        setIsTrading(true);

        try {
            if (!wallet) return;

            const chainIdString = wallet.chainId;
            const currentChainId = Number(chainIdString.includes(':') ? chainIdString.split(':')[1] : chainIdString);
            if (currentChainId !== baseSepolia.id) {
                await wallet.switchChain(baseSepolia.id);
            }

            const provider = await wallet.getEthereumProvider();
            const walletClient = createWalletClient({
                chain: baseSepolia,
                transport: custom(provider),
            });

            const [address] = await walletClient.getAddresses();
            const amountUSD = parseFloat(amount);
            const ethAmount = amountUSD / ETH_PRICE;
            const ethValue = parseEther(ethAmount.toFixed(18));

            const hash = await walletClient.writeContract({
                address: contractAddress as `0x${string}`,
                abi: bitcoinBettingAbi,
                functionName: 'placeBet',
                args: [selectedCandidateId],
                account: address,
                value: ethValue,
                gas: BigInt(300000),
                chain: baseSepolia,
            });

            alert(`Bet Placed for ${selectedCandidateId}! Tx Hash: ${hash.slice(0, 10)}...`);
            setAmount('');
            if (onTradeAction) {
                await onTradeAction(selectedCandidateId, amountUSD);
            }
            setTimeout(fetchContractData, 5000);
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Trade failed:', err);
            alert('Trade failed: ' + (err.shortMessage || 'Please try again.'));
        } finally {
            setIsTrading(false);
        }
    };

    const handleClaim = async () => {
        if (!wallet) return;
        setIsClaiming(true);
        try {
            const provider = await wallet.getEthereumProvider();
            const walletClient = createWalletClient({
                chain: baseSepolia,
                transport: custom(provider),
            });
            const [address] = await walletClient.getAddresses();

            const hash = await walletClient.writeContract({
                address: contractAddress as `0x${string}`,
                abi: bitcoinBettingAbi,
                functionName: 'claim',
                account: address,
                chain: baseSepolia,
            });

            alert(`Winnings claimed! Tx Hash: ${hash.slice(0, 10)}...`);
            setTimeout(fetchContractData, 5000);
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Claim failed:', err);
            alert('Claim failed: ' + (err.shortMessage || 'Please try again.'));
        } finally {
            setIsClaiming(false);
        }
    };

    // Calculate USD Pools
    const totalPoolETH = parseFloat(formatEther(totalPool));
    const yesPoolETH = parseFloat(formatEther(outcomeTotals.yes));
    const noPoolETH = parseFloat(formatEther(outcomeTotals.no));

    const totalPoolUSD = Math.round(totalPoolETH * ETH_PRICE);
    const yesPoolUSD = Math.round(yesPoolETH * ETH_PRICE);
    const noPoolUSD = Math.round(noPoolETH * ETH_PRICE);

    // Prefer Supabase candidate data for UI if available, fallback to contract data
    const candidates = initialCandidates.length > 0
        ? initialCandidates
        : [
            { id: 'Yes', name: 'Yes', initials: 'Y', color: '#00d395', pool: yesPoolUSD },
            { id: 'No', name: 'No', initials: 'N', color: '#ff4d4d', pool: noPoolUSD }
        ];

    const totalPoolUSDUI = candidates.reduce((sum, c) => sum + (c.pool || 0), 0);

    const getCandidateStats = (pool: number) => {
        if (totalPoolUSDUI === 0) {
            return { probabilityPercent: 50, multiplier: 2 };
        }
        const probability = pool / totalPoolUSDUI;
        const probabilityPercent = probability * 100;
        const multiplier = pool > 0 ? totalPoolUSDUI / pool : 0;
        return { probabilityPercent, multiplier };
    };

    const selectedCandidate = candidates.find(c => c.name === selectedCandidateId) || candidates[0];
    const selectedStats = getCandidateStats(selectedCandidate.pool);

    const amountNum = parseFloat(amount) || 0;
    const projectedTotalUSD = totalPoolUSDUI + amountNum;
    const projectedPoolUSD = (selectedCandidate.pool || 0) + amountNum;
    const projectedMultiplier = projectedPoolUSD > 0 ? projectedTotalUSD / projectedPoolUSD : 0;
    const estimatedPayout = (amountNum * projectedMultiplier).toFixed(2);

    const hasWinningBet = marketResolved && winningOutcome !== '' && (
        (winningOutcome === 'Yes' && userBets.yes > 0n) ||
        (winningOutcome === 'No' && userBets.no > 0n)
    );

    const renderTradeButton = () => {
        if (!authenticated) {
            return (
                <button
                    onClick={() => login()}
                    className="w-full py-3 bg-gray-900 text-white font-bold text-[15px] rounded-xl shadow-lg transition-all hover:bg-gray-800"
                >
                    Log In to Trade
                </button>
            )
        }

        const walletChainIdStr = wallet?.chainId;
        const walletChainId = walletChainIdStr ? Number(walletChainIdStr.includes(':') ? walletChainIdStr.split(':')[1] : walletChainIdStr) : null;

        if (wallet && walletChainId !== baseSepolia.id) {
            return (
                <button
                    onClick={async () => {
                        try {
                            await wallet.switchChain(baseSepolia.id);
                        } catch (e) {
                            console.error("Switch chain failed", e);
                            alert("Failed to switch network.");
                        }
                    }}
                    className="w-full py-3 bg-yellow-500 text-white font-bold text-[15px] rounded-xl shadow-lg transition-all hover:bg-yellow-600"
                >
                    Switch to Base Sepolia
                </button>
            )
        }

        return (
            <button
                onClick={handleTrade}
                className={`w-full py-3 text-white font-bold text-[15px] rounded-xl shadow-lg transition-all active:scale-[0.98] ${amount && !isTrading && isBettingActive ? (selectedCandidateId === 'Yes' ? 'bg-[#00d395] hover:bg-[#00c087] shadow-emerald-500/20' : 'bg-[#ff4d4d] hover:bg-[#e60000] shadow-red-500/20') : 'bg-gray-300 cursor-not-allowed shadow-none'}`}
                disabled={!amount || isTrading || !isBettingActive}
            >
                {!isBettingActive ? 'Betting Closed' : isTrading ? 'Processing...' : 'Place Order'}
            </button>
        )
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex-1 font-sans">
                {/* Header & Stats */}
                <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-2">
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Crypto</span>
                        <span className="text-gray-400 text-xs font-semibold">• Vol ${totalPoolUSDUI.toFixed(0)}</span>
                    </div>
                    {timeLeft && (
                        <div className={`px-2 py-0.5 rounded-full text-xs font-bold border ${isBettingActive ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                            ⏳ {timeLeft}
                        </div>
                    )}
                </div>

                <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                    Will Bitcoin reach $75k in 24 hours?
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Predict if BTC will hit the target price. Powered by a secure, audited smart contract.
                </p>

                {/* Admin Panel */}
                {authenticated && wallet && wallet.address.toLowerCase() === contractOwner && (
                    <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-wrap items-center gap-4">
                        <span className="text-orange-800 font-bold text-sm">Admin:</span>
                        {(!isBettingActive || marketResolved) && (
                            <>
                                <input
                                    type="number"
                                    value={durationInput}
                                    onChange={e => setDurationInput(e.target.value)}
                                    className="border border-orange-300 p-1.5 rounded w-20 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Mins"
                                />
                                <button
                                    onClick={handleStartBetting}
                                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 text-sm rounded transition-all"
                                >
                                    Reset Bitcoin Market
                                </button>
                            </>
                        )}
                        {isBettingActive && (
                            <span className="text-gray-500 text-sm">Betting is live. Cannot resolve yet.</span>
                        )}
                        {!isBettingActive && endTime !== null && endTime > 0 && !marketResolved && (
                            <div className="flex gap-2">
                                <button onClick={() => handleResolveMarket('Yes')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-bold">Resolve YES</button>
                                <button onClick={() => handleResolveMarket('No')} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold">Resolve NO</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Claim Winnings Banner */}
                {hasWinningBet && (
                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-xl shadow p-4 mb-6 text-white text-center">
                        <h3 className="text-lg font-bold mb-1">🎉 You Won!</h3>
                        <p className="text-xs opacity-90 mb-3">You correctly predicted {winningOutcome}.</p>
                        <button
                            onClick={handleClaim}
                            disabled={isClaiming}
                            className="w-full py-2 bg-white text-emerald-600 font-bold text-sm rounded shadow hover:bg-emerald-50 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            {isClaiming ? 'Claiming...' : 'Claim Your Winnings'}
                        </button>
                    </div>
                )}


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Candidates */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">Options</h3>
                        {candidates.map((candidate) => {
                            const { probabilityPercent, multiplier } = getCandidateStats(candidate.pool);
                            return (
                                <div
                                    key={candidate.id}
                                    className={`group relative overflow-hidden flex items-center p-3 rounded-xl border transition-all cursor-pointer ${selectedCandidateId === candidate.name ? 'bg-blue-50/30 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
                                    onClick={() => setSelectedCandidateId(candidate.name)}
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white" style={{ backgroundColor: candidate.color }}>
                                        {candidate.initials || candidate.name.charAt(0)}
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <h4 className="font-bold text-gray-900 text-sm">{candidate.name}</h4>
                                    </div>
                                    <div className="text-right mx-2 min-w-[50px]">
                                        <span className="block font-bold text-gray-900 text-base">{totalPoolUSDUI > 0 ? probabilityPercent.toFixed(0) : 50}%</span>
                                    </div>
                                    <div className="text-right mr-3 hidden sm:block">
                                        <span className="text-xs font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{multiplier.toFixed(2)}x</span>
                                    </div>
                                    <div className="absolute left-0 bottom-0 h-1 opacity-20 group-hover:opacity-40 transition-all duration-500 ease-out" style={{ width: `${totalPoolUSDUI > 0 ? probabilityPercent : 50}%`, backgroundColor: candidate.color }} />
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: Order Ticket */}
                    <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                                <span className="text-xs font-bold text-gray-500 uppercase">Buy Order</span>
                                <span className="ml-auto font-bold text-gray-900 text-sm">{selectedCandidate.name}</span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Current Odds</span>
                                <span className="font-bold text-gray-900">{selectedStats.multiplier.toFixed(2)}x</span>
                            </div>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                                <input
                                    type="text"
                                    value={amount}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) setAmount(val);
                                    }}
                                    placeholder="0"
                                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00d395]"
                                />
                            </div>

                            <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-200 pt-3">
                                <div className="flex justify-between"><span>Total Pool</span> <span className="font-medium text-gray-900">${totalPoolUSDUI.toFixed(0)}</span></div>
                                <div className="flex justify-between"><span>Est. Payout</span> <span className="font-bold text-emerald-600">${estimatedPayout}</span></div>
                            </div>

                            {renderTradeButton()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
