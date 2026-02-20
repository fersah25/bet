'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, parseEther, formatEther, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { bitcoinBettingAbi } from '@/constants/bitcoinBettingAbi';

export interface BitcoinBettingWidgetProps {
    contractAddress: string;
}

export default function BitcoinBettingWidget({ contractAddress }: BitcoinBettingWidgetProps) {
    const [amountETH, setAmountETH] = useState<string>('');
    const [isTrading, setIsTrading] = useState<boolean>(false);

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

            alert(`Betting Started! Tx Hash: ${hash.slice(0, 10)}...`);
            setMarketResolved(false);
            setWinningOutcome('');
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

    const handleTrade = async (prediction: 'Yes' | 'No') => {
        if (!amountETH || isNaN(parseFloat(amountETH))) return;
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
            const ethValue = parseEther(amountETH);

            const hash = await walletClient.writeContract({
                address: contractAddress as `0x${string}`,
                abi: bitcoinBettingAbi,
                functionName: 'placeBet',
                args: [prediction],
                account: address,
                value: ethValue,
                gas: BigInt(300000),
                chain: baseSepolia,
            });

            alert(`Bet Placed for ${prediction}! Tx Hash: ${hash.slice(0, 10)}...`);
            setAmountETH('');
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

    const totalPoolETH = parseFloat(formatEther(totalPool)).toFixed(4);
    const yesPoolETH = parseFloat(formatEther(outcomeTotals.yes)).toFixed(4);
    const noPoolETH = parseFloat(formatEther(outcomeTotals.no)).toFixed(4);

    const userYesETH = parseFloat(formatEther(userBets.yes)).toFixed(4);
    const userNoETH = parseFloat(formatEther(userBets.no)).toFixed(4);

    const hasWinningBet = marketResolved && winningOutcome !== '' && (
        (winningOutcome === 'Yes' && userBets.yes > 0n) ||
        (winningOutcome === 'No' && userBets.no > 0n)
    );

    return (
        <div className="bg-[#131722] text-white rounded-2xl p-6 shadow-xl border border-gray-800 flex-1 font-sans">
            {/* Header & Stats */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <span className="bg-gray-800 text-gray-300 text-[10px] items-center font-bold px-2 py-1 rounded uppercase tracking-wide border border-gray-700">Crypto</span>
                    <span className="text-gray-400 text-sm font-medium">Vol {totalPoolETH} ETH</span>
                </div>
                {timeLeft && (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isBettingActive ? 'bg-blue-900/30 text-blue-400 border-blue-800 animate-pulse' : 'bg-orange-900/30 text-orange-400 border-orange-800'}`}>
                        ⏳ {timeLeft}
                    </div>
                )}
            </div>

            <h2 className="text-2xl font-bold text-white leading-tight mb-2">
                Will Bitcoin reach $75k in 24 hours?
            </h2>
            <p className="text-sm text-gray-400 mb-6">
                Predict if BTC will hit the target price. Powered by a secure, audited smart contract.
            </p>

            {/* Admin Panel */}
            {authenticated && wallet && wallet.address.toLowerCase() === contractOwner && (
                <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-xl flex flex-wrap items-center gap-4">
                    <span className="text-orange-400 font-bold text-sm">Admin:</span>
                    {!isBettingActive && endTime === 0 && (
                        <>
                            <input
                                type="number"
                                value={durationInput}
                                onChange={e => setDurationInput(e.target.value)}
                                className="bg-gray-900 border border-gray-600 text-white p-1.5 rounded w-20 text-sm focus:outline-none focus:border-blue-500"
                                placeholder="Mins"
                            />
                            <button
                                onClick={handleStartBetting}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 text-sm rounded transition-all"
                            >
                                Start Betting
                            </button>
                        </>
                    )}
                    {isBettingActive && (
                        <span className="text-gray-400 text-sm">Betting is live. Cannot resolve yet.</span>
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
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-xl shadow p-5 mb-6 text-white text-center border border-emerald-500">
                    <h3 className="text-xl font-bold mb-2">🎉 You Won!</h3>
                    <p className="text-sm opacity-90 mb-4">You correctly predicted {winningOutcome}.</p>
                    <button
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className="w-full py-3 bg-white text-emerald-700 font-bold text-sm rounded shadow hover:bg-emerald-50 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                        {isClaiming ? 'Claiming...' : 'Claim Rewards'}
                    </button>
                </div>
            )}

            {marketResolved && !hasWinningBet && (
                <div className="bg-gray-800 rounded-xl shadow p-5 mb-6 text-gray-300 text-center border border-gray-700">
                    <h3 className="text-lg font-bold">Market Resolved</h3>
                    <p className="text-sm">The outcome was {winningOutcome}.</p>
                </div>
            )}

            {/* Betting Interface */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">

                {/* User Input */}
                <div className="mb-5 space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Entry Amount (ETH)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Ξ</span>
                        <input
                            type="text"
                            value={amountETH}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) setAmountETH(val);
                            }}
                            placeholder="0.01"
                            disabled={!isBettingActive || isTrading}
                            className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                        />
                    </div>
                </div>

                {/* Yes/No Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    {/* YES Section */}
                    <div className="flex flex-col space-y-2">
                        <button
                            onClick={() => authenticated ? handleTrade('Yes') : login()}
                            disabled={isTrading || (!isBettingActive && authenticated) || (authenticated && !amountETH)}
                            className="w-full py-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 font-bold text-lg rounded-xl transition-all hover:bg-emerald-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {isTrading ? '...' : authenticated ? 'YES' : 'Log In'}
                        </button>
                        <div className="text-center text-xs text-gray-400">
                            Pool: {yesPoolETH} ETH
                        </div>
                        {parseFloat(userYesETH) > 0 && (
                            <div className="text-center text-xs text-emerald-400 font-semibold">
                                Your Bet: {userYesETH} ETH
                            </div>
                        )}
                    </div>

                    {/* NO Section */}
                    <div className="flex flex-col space-y-2">
                        <button
                            onClick={() => authenticated ? handleTrade('No') : login()}
                            disabled={isTrading || (!isBettingActive && authenticated) || (authenticated && !amountETH)}
                            className="w-full py-4 bg-red-500/10 border border-red-500/50 text-red-400 font-bold text-lg rounded-xl transition-all hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {isTrading ? '...' : authenticated ? 'NO' : 'Log In'}
                        </button>
                        <div className="text-center text-xs text-gray-400">
                            Pool: {noPoolETH} ETH
                        </div>
                        {parseFloat(userNoETH) > 0 && (
                            <div className="text-center text-xs text-red-400 font-semibold">
                                Your Bet: {userNoETH} ETH
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
