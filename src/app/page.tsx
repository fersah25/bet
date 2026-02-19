'use client';

import { useState } from 'react';

export default function Home() {
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState<string>('');

  // Mock Data
  const question = "Will Bitcoin finish the day above $75,000?";
  const prices = { yes: 0.65, no: 0.35 };
  const returns = {
    yes: 'Win $1.00 if Yes',
    no: 'Win $1.00 if No'
  };

  const estimatedPayout = amount ? (parseFloat(amount) / (selectedOutcome === 'yes' ? prices.yes : prices.no)).toFixed(2) : '0.00';

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // allow only numbers and decimals
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmount(val);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">

      {/* Navbar Placeholder */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="text-xl font-bold tracking-tight text-blue-600">BET</div>
        <div className="text-sm font-medium text-gray-500">Balance: $1,000.00</div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Chart & Market Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{question}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Volume: <strong>$1.2M</strong></span>
                  <span>•</span>
                  <span>Ends: <strong>Today, 4:00 PM</strong></span>
                </div>
              </div>
              {/* TradingView Widget Container */}
              <div className="h-[500px] w-full bg-gray-50 relative">
                {/* Visual Placeholder for where the chart would interact if we had API access, using iframe for now */}
                <iframe
                  className="w-full h-full"
                  src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_76d87&symbol=COINBASE%3ABTCUSD&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Light&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=COINBASE%3ABTCUSD"
                  style={{ border: 'none' }}
                  title="Bitcoin Chart"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">About this market</h3>
              <p className="text-gray-600 leading-relaxed">
                This market asks whether Bitcoin (BTC) will have a price above $75,000 at the daily close (Market Close 4:00 PM ET). The resolution source will be the official Coinbase price.
              </p>
            </div>
          </div>

          {/* Right Column: Trading Interface */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden sticky top-24">

              {/* Buy / Sell Toggle */}
              <div className="grid grid-cols-2 border-b border-gray-200">
                <button
                  onClick={() => setOrderSide('buy')}
                  className={`py-3 text-sm font-bold uppercase transition-colors ${orderSide === 'buy' ? 'text-emerald-500 border-b-2 border-emerald-500 bg-emerald-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setOrderSide('sell')}
                  className={`py-3 text-sm font-bold uppercase transition-colors ${orderSide === 'sell' ? 'text-rose-500 border-b-2 border-rose-500 bg-rose-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Sell
                </button>
              </div>

              <div className="p-6 space-y-6">

                {/* Outcome Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Outcome</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedOutcome('yes')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${selectedOutcome === 'yes'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-emerald-200 hover:bg-gray-50 text-gray-600'
                        }`}
                    >
                      <span className="text-lg font-bold">YES</span>
                      <span className="text-sm font-medium">{orderSide === 'buy' ? '65¢' : '35¢'}</span>
                    </button>
                    <button
                      onClick={() => setSelectedOutcome('no')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${selectedOutcome === 'no'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-gray-200 hover:border-rose-200 hover:bg-gray-50 text-gray-600'
                        }`}
                    >
                      <span className="text-lg font-bold">NO</span>
                      <span className="text-sm font-medium">{orderSide === 'buy' ? '35¢' : '65¢'}</span>
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</label>
                    <span className="text-xs text-blue-600 font-medium cursor-pointer">Max: $1000</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                    <input
                      type="text"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-lg"
                    />
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Price per share</span>
                    <span className="font-medium text-gray-900">
                      {selectedOutcome === 'yes' ? (orderSide === 'buy' ? '$0.65' : '$0.35') : (orderSide === 'buy' ? '$0.35' : '$0.65')}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Potential Payout</span>
                    <span className="font-medium text-emerald-600">${estimatedPayout}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 pt-2 border-t border-gray-200">
                    <span>Fees</span>
                    <span className="font-medium text-gray-900">$0.00</span>
                  </div>
                </div>

                {/* Action Button */}
                <button className={`w-full py-4 text-white font-bold text-lg rounded-xl shadow-lg transition-transform active:scale-[0.98] ${orderSide === 'buy'
                    ? 'bg-[#00d395] hover:bg-[#00c087] shadow-emerald-500/20'
                    : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                  }`}>
                  {orderSide === 'buy' ? 'Place Order' : 'Sell Position'}
                </button>

                <p className="text-center text-xs text-gray-400">
                  By trading, you agree to the Terms of Service.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}