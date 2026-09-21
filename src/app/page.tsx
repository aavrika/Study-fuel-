'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
        <span className="text-sm font-bold text-stone-700">Loading Study Fuel...</span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return <App />;
}
