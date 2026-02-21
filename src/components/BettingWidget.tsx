'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, parseEther, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { bettingContractABI } from '@/constants/abi';

const ETH_PRICE = 2000; // Hardcoded ETH Price for Demo conversion

export interface Candidate {
    id: string; // UUID or string
    name: string;
    initials: string;
    color: string;
    pool: number;
    image_url?: string;
}

interface BettingWidgetProps {
    title: string;
    description: string;
    category: string;
    contractAddress: string;
    initialCandidates: Candidate[];
    onTradeAction?: (candidateId: string, tradeAmount: number) => Promise<void>;
    onRestartAction?: () => Promise<void>;
    allowAdminPanel?: boolean;
}

export default function BettingWidget({
    title,
    description,
    category,
    contractAddress,
    initialCandidates,
    onTradeAction,
    onRestartAction,
    allowAdminPanel = true,
}: BettingWidgetProps) {
    const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [amount, setAmount] = useState<string>('');
    const [isTrading, setIsTrading] = useState<boolean>(false);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [contractOwner, setContractOwner] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isBettingActive, setIsBettingActive] = useState<boolean>(false);
    const [durationInput, setDurationInput] = useState<string>('60');

    const [marketResolved, setMarketResolved] = useState<boolean>(false);
    const [winningCandidate, setWinningCandidate] = useState<string>('');
    const [hasWinningBet, setHasWinningBet] = useState<boolean>(false);
    const [isClaiming, setIsClaiming] = useState<boolean>(false);

    const { login, authenticated } = usePrivy();
    const { wallets } = useWallets();
    const wallet = wallets[0];

    useEffect(() => {
        if (initialCandidates.length > 0 && candidates.length === 0) {
            setCandidates(initialCandidates);
            if (!selectedCandidateId) {
                setSelectedCandidateId(initialCandidates[0].id);
            }
        } else if (initialCandidates.length > 0 && initialCandidates !== candidates) {
            // Just keeping candidates in sync if initialCandidates change dynamically
            setCandidates(initialCandidates);
            if (!selectedCandidateId && initialCandidates.length > 0) {
                setSelectedCandidateId(initialCandidates[0].id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCandidates]);

    useEffect(() => {
        fetchContractData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contractAddress]);

    const fetchContractData = async () => {
        try {
            const publicClient = createPublicClient({
                chain: baseSepolia,
                transport: http()
            });

            const fetchedOwner = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: bettingContractABI,
                functionName: 'owner',
            }) as string;

            const fetchedEndTime = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: bettingContractABI,
                functionName: 'endTime',
            }) as bigint;

            const fetchedMarketResolved = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: bettingContractABI,
                functionName: 'marketResolved',
            }) as boolean;

            const fetchedWinningCandidate = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: bettingContractABI,
                functionName: 'winningCandidate',
            }) as string;

            setContractOwner(fetchedOwner.toLowerCase());
            setEndTime(Number(fetchedEndTime));
            setMarketResolved(fetchedMarketResolved);
            setWinningCandidate(fetchedWinningCandidate);
        } catch (err) {
            console.error('Error fetching contract data:', err);
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

    useEffect(() => {
        const fetchUserWinningBet = async () => {
            if (!wallet || !marketResolved || !winningCandidate) {
                setHasWinningBet(false);
                return;
            }
            try {
                const publicClient = createPublicClient({
                    chain: baseSepolia,
                    transport: http()
                });
                const betAmount = await publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: bettingContractABI,
                    functionName: 'userBets',
                    args: [wallet.address as `0x${string}`, winningCandidate]
                }) as bigint;
                setHasWinningBet(betAmount > 0n);
            } catch (err) {
                console.error('Error fetching user winning bet:', err);
                setHasWinningBet(false);
            }
        };
        fetchUserWinningBet();
    }, [wallet, marketResolved, winningCandidate, contractAddress]);

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
                abi: bettingContractABI,
                functionName: 'claim',
                account: address,
                chain: baseSepolia,
            });

            alert(`Winnings transferred to your wallet! Tx Hash: ${hash.slice(0, 10)}...`);
            setHasWinningBet(false);
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Claim failed:', err);
            alert('Claim failed: ' + (err.shortMessage || 'Please try again.'));
        } finally {
            setIsClaiming(false);
        }
    };

    const totalPool = candidates?.reduce((sum, c) => sum + (c?.pool || 0), 0) || 0;

    const getCandidateStats = (c: Candidate | undefined) => {
        if (!c) return { probability: 0, probabilityPercent: 0, multiplier: 0 };
        if (totalPool === 0) {
            return { probability: 1 / candidates.length, probabilityPercent: 100 / candidates.length, multiplier: candidates.length };
        }
        const pool = c.pool || 0;
        const probability = pool / totalPool;
        const probabilityPercent = probability * 100;
        const multiplier = pool > 0 ? totalPool / pool : 0;
        return { probability, probabilityPercent, multiplier };
    };

    const selectedCandidate = candidates?.find((c) => c.id === selectedCandidateId) || (candidates && candidates.length > 0 ? candidates[0] : null);
    const selectedStats = getCandidateStats(selectedCandidate || undefined);

    const amountNum = parseFloat(amount) || 0;
    const projectedTotal = totalPool + amountNum;
    const projectedPool = (selectedCandidate?.pool || 0) + amountNum;
    const projectedMultiplier = projectedPool > 0 ? projectedTotal / projectedPool : 0;
    const estimatedPayout = (amountNum * projectedMultiplier).toFixed(2);

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
                abi: bettingContractABI,
                functionName: 'startBetting',
                args: [BigInt(durationInput)],
                account: address,
                chain: baseSepolia,
            });

            alert(`Betting Started! Tx Hash: ${hash.slice(0, 10)}...`);
            setMarketResolved(false);
            setWinningCandidate('');
            setHasWinningBet(false);
            setTimeout(fetchContractData, 5000);
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error(err);
            alert('Failed to start betting: ' + (err.shortMessage || err.message));
        }
    };

    const handleTrade = async () => {
        if (!amount || isNaN(parseFloat(amount)) || !selectedCandidate) return;
        if (marketResolved || !isBettingActive) {
            alert('Market is currently closed or already resolved. You cannot place new bets.');
            return;
        }
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

            const mapCandidateName = (name: string): string => {
                if (name.includes('Warsh')) return 'Warsh';
                if (name.includes('Shelton')) return 'Shelton';
                if (name.includes('Laffer')) return 'Laffer';
                if (name.includes('Pulte')) return 'Pulte';
                return name;
            };

            const candidateString = mapCandidateName(String(selectedCandidate.name));

            const publicClient = createPublicClient({
                chain: baseSepolia,
                transport: http()
            });

            // Simulate the contract call first to catch explicit Solidity reverts natively
            try {
                await publicClient.simulateContract({
                    address: contractAddress as `0x${string}`,
                    abi: bettingContractABI,
                    functionName: 'placeBet',
                    args: [candidateString],
                    account: address,
                    value: ethValue,
                });
            } catch (simErr: any) {
                console.error("Simulation failed:", simErr);
                throw new Error("Contract Revert: " + (simErr.shortMessage || simErr.message));
            }

            const hash = await walletClient.writeContract({
                address: contractAddress as `0x${string}`,
                abi: bettingContractABI,
                functionName: 'placeBet',
                args: [candidateString],
                account: address,
                value: ethValue,
                // Adjusting gas slightly or removing gas limit optionally if resolving issues natively, 
                // but keeping it as requested. Let viem handle exact errors if it reverts.
                gas: BigInt(300000),
                chain: baseSepolia,
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            if (receipt.status !== 'success') {
                throw new Error('Transaction reverted on-chain. Status: ' + receipt.status);
            }

            // Database and Optimistic Update ONLY run if tx is successful
            const newPoolAmount = (selectedCandidate.pool || 0) + amountUSD;
            const newCandidates = candidates.map(c =>
                c.id === selectedCandidate.id ? { ...c, pool: newPoolAmount } : c
            );
            setCandidates(newCandidates);
            setAmount('');
            alert('Order Placed Successfully! Tx Hash: ' + hash.slice(0, 10) + '...');

            if (onTradeAction) {
                await onTradeAction(selectedCandidate.id, amountUSD);
            }

        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Trade failed details:', err);
            alert('Transaction Failed: Database not updated.\n' + (err.shortMessage || err.message || ''));
        } finally {
            setIsTrading(false);
        }
    };

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
                className={`w-full py-3 text-white font-bold text-[15px] rounded-xl shadow-lg transition-all active:scale-[0.98] ${amount && !isTrading && isBettingActive && !marketResolved ? 'bg-[#00d395] hover:bg-[#00c087] shadow-emerald-500/20' : 'bg-gray-300 cursor-not-allowed shadow-none'}`}
                disabled={!amount || isTrading || !isBettingActive || marketResolved}
            >
                {marketResolved || !isBettingActive ? 'Market Closed' : isTrading ? 'Processing...' : 'Place Order'}
            </button>
        )
    }

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex-1 flex flex-col h-full">
                <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-2">
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">{category}</span>
                        <span className="text-gray-400 text-xs font-semibold">• Vol ${totalPool.toFixed(0)}</span>
                    </div>
                    {timeLeft && (
                        <div className={`px-2 py-0.5 rounded-full text-xs font-bold border ${isBettingActive ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                            ⏳ {timeLeft}
                        </div>
                    )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                    {title}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    {description}
                </p>

                {allowAdminPanel && authenticated && wallet && wallet.address.toLowerCase() === contractOwner && (
                    <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-wrap items-center gap-4">
                        <span className="text-orange-800 font-bold text-sm">Admin:</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${(!marketResolved && isBettingActive) ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            Status: {(!marketResolved && isBettingActive) ? 'OPEN' : 'CLOSED'}
                        </span>
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
                            Start Betting
                        </button>
                        {onRestartAction && (
                            <button
                                onClick={async () => {
                                    await onRestartAction();
                                    alert(`${category === 'Economics' ? 'Fed' : category} Market Data Reset!`);
                                    // Optionally refresh candidates if you want, but simple data update is fine
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 text-sm rounded transition-all ml-auto"
                            >
                                Reset {category === 'Economics' ? 'Fed' : category} Market
                            </button>
                        )}
                    </div>
                )}

                {/* Claim Winnings Banner */}
                {marketResolved && hasWinningBet && winningCandidate && winningCandidate !== '' && (
                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-xl shadow p-4 mb-6 text-white text-center">
                        <h3 className="text-lg font-bold mb-1">🎉 You Won!</h3>
                        <p className="text-xs opacity-90 mb-3">You correctly predicted {winningCandidate}.</p>
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
                        {candidates && candidates.length > 0 ? (
                            candidates.map((candidate) => {
                                const { probabilityPercent, multiplier } = getCandidateStats(candidate);
                                return (
                                    <div
                                        key={candidate?.id || Math.random()}
                                        className={`group relative overflow-hidden flex items-center p-3 rounded-xl border transition-all cursor-pointer ${selectedCandidateId === candidate?.id ? 'bg-blue-50/30 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
                                        onClick={() => candidate?.id && setSelectedCandidateId(candidate.id)}
                                    >
                                        {candidate?.image_url ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={candidate.image_url} alt={candidate.name} className="w-8 h-8 rounded-full object-cover shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                                        ) : null}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold text-xs shrink-0 ${candidate?.image_url ? 'hidden' : ''}`} style={!candidate?.image_url && candidate?.color ? { backgroundColor: candidate.color, color: 'white' } : {}}>
                                            {(candidate?.name || '?').charAt(0)}
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <h4 className="font-bold text-gray-900 text-sm">{candidate?.name || 'Unknown'}</h4>
                                        </div>
                                        <div className="text-right mx-2 min-w-[50px]">
                                            <span className="block font-bold text-gray-900 text-base">{totalPool > 0 ? probabilityPercent.toFixed(0) : (100 / candidates.length).toFixed(0)}%</span>
                                        </div>
                                        <div className="text-right mr-3 hidden sm:block">
                                            <span className="text-xs font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{multiplier.toFixed(2)}x</span>
                                        </div>
                                        <div className="absolute left-0 bottom-0 h-1 bg-[#00d395] opacity-20 group-hover:opacity-40 transition-all duration-500 ease-out" style={{ width: `${totalPool > 0 ? probabilityPercent : 100 / candidates.length}%`, backgroundColor: candidate?.color || '#00d395' }} />
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-4 text-gray-400 text-sm">No options available</div>
                        )}
                    </div>

                    {/* Right: Order Ticket */}
                    <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
                        {selectedCandidate ? (
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
                                    <div className="flex justify-between"><span>Total Pool</span> <span className="font-medium text-gray-900">{totalPool.toFixed(0)} pts</span></div>
                                    <div className="flex justify-between"><span>Est. Payout</span> <span className="font-bold text-emerald-600">${estimatedPayout}</span></div>
                                </div>

                                {renderTradeButton()}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-gray-400">Select an option to trade</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
