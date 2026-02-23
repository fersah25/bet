'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useUserSync } from '@/hooks/useUserSync';
import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
    const { login, logout, authenticated, user } = usePrivy();
    const { userProfile } = useUserSync();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const displayIdentifier = userProfile?.email || userProfile?.username || user?.wallet?.address?.slice(0, 6) + '...' + user?.wallet?.address?.slice(-4);

    return (
        <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center space-x-8">
                <Link href="/" className="flex items-center space-x-2">
                    <div className="bg-[#0052FF] text-white font-bold px-2 py-1 rounded text-lg">B</div>
                    <span className="text-xl font-bold tracking-tight text-[#0052FF]">BaseBet</span>
                </Link>
                <div className="hidden md:flex items-center space-x-6">
                    <Link href="/" className="text-gray-600 font-semibold hover:text-gray-900 transition-colors">Economics</Link>
                    <Link href="/crypto" className="text-gray-600 font-semibold hover:text-gray-900 transition-colors">Crypto</Link>
                    <Link href="/social" className="text-gray-600 font-semibold hover:text-gray-900 transition-colors">Social</Link>
                    <Link href="/weather" className="text-gray-600 font-semibold hover:text-gray-900 transition-colors">Weather</Link>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {!authenticated ? (
                    <>
                        <button
                            onClick={() => login()}
                            className="text-gray-600 font-semibold text-sm hover:text-gray-900 transition-colors px-3 py-2"
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => login()}
                            className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition-all shadow-sm"
                        >
                            Sign Up
                        </button>
                    </>
                ) : (
                    <div className="relative">
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                            {/* Profile Icon / Avatar */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00d395] to-blue-500 p-[1px]">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                    {userProfile?.avatar_url ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400">
                                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </div>

                            {/* Address / Username */}
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold text-gray-900 max-w-[100px] truncate">
                                    {displayIdentifier}
                                </span>
                                <span className="text-[10px] text-gray-500 font-medium">My Account</span>
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-4 py-2 border-b border-gray-50">
                                    <p className="text-xs text-gray-500">Signed in as</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{displayIdentifier}</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                                >
                                    Log Out
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
