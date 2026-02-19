'use client';

import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { useUserSync } from '@/hooks/useUserSync';

export default function Navbar() {
    const { open } = useAppKit();
    const { address, isConnected } = useAccount();
    const { userProfile } = useUserSync();

    return (
        <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center space-x-2">
                <div className="bg-[#00d395] text-white font-bold px-2 py-1 rounded text-lg">K</div>
                <span className="text-xl font-bold tracking-tight text-gray-900">KalshiClone</span>
            </div>
            <div className="flex items-center gap-4">
                {!isConnected ? (
                    <button
                        onClick={() => open()}
                        className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition-all"
                    >
                        Connect Wallet
                    </button>
                ) : (
                    <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                        {/* Profile Icon / Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00d395] to-blue-500 p-[1px]">
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {userProfile?.avatar_url ? (
                                    <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400">
                                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        </div>

                        {/* Address / Username */}
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-900">
                                {userProfile?.username || 'Loading...'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                                {address?.slice(0, 6)}...{address?.slice(-4)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
