'use client';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden border border-gray-100">

        {/* Card Header / Image Area (optional visual interest) */}
        <div className="h-4 bg-gradient-to-r from-blue-500 to-purple-600 w-full" />

        <div className="p-8">
          {/* Market Status Tag */}
          <div className="flex items-center space-x-2 mb-6">
            <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Market</span>
          </div>

          {/* Question */}
          <h1 className="text-2xl font-bold leading-tight mb-8 text-gray-900">
            Will Bitcoin finish the day above $75,000?
          </h1>

          {/* Probability Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-emerald-600">65% Yes</span>
              <span className="text-rose-500">35% No</span>
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 w-[65%]"></div>
              <div className="h-full bg-rose-500 w-[35%]"></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button className="group flex flex-col items-center justify-center py-4 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all duration-200 active:scale-95">
              <span className="text-lg font-bold text-emerald-700 group-hover:text-emerald-800">YES</span>
              <span className="text-xs font-medium text-emerald-600/70 mt-1">Win 10 Points</span>
            </button>

            <button className="group flex flex-col items-center justify-center py-4 px-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all duration-200 active:scale-95">
              <span className="text-lg font-bold text-rose-700 group-hover:text-rose-800">NO</span>
              <span className="text-xs font-medium text-rose-600/70 mt-1">Win 10 Points</span>
            </button>
          </div>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Market closes at 12:00 AM UTC • $XYZ Volume
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}