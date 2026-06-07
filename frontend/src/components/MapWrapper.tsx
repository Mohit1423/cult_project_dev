'use client';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('./LiveMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900/50 backdrop-blur-sm animate-pulse rounded-[2rem] flex items-center justify-center border border-white/5">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-indigo-300 font-bold tracking-widest uppercase text-sm">Initializing Satellite Uplink...</div>
      </div>
    </div>
  )
});

export default function MapWrapper() {
  return <LiveMap />;
}
