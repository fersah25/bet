'use client';

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
} from '@coinbase/onchainkit/identity';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0052FF] text-white p-4 text-center">
      <div className="bg-black p-10 rounded-3xl border-2 border-white/10 shadow-2xl">
        <h1 className="text-6xl font-black italic mb-4 tracking-tighter">BET</h1>
        <p className="text-xl font-medium opacity-80 mb-8">Base Network Prediction Market</p>

        <div className="flex flex-col gap-6 items-center">
          <div className="bg-white/5 p-6 rounded-xl border border-white/10 w-full">
            <p className="text-sm text-gray-400">Featured Bet</p>
            <p className="text-xl font-bold">Will Base TVL hit $10B? 📈</p>
          </div>

          <div className="flex justify-center">
            <Wallet>
              <ConnectWallet>
                <Avatar className="h-6 w-6" />
                <Name />
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address />
                </Identity>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </div>
    </main>
  );
}