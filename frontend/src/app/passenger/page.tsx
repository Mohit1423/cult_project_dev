'use client';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut, MapPin } from 'lucide-react';

export default function PassengerDashboard() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">Hello, {user.name} 👋</h1>
          <button 
            onClick={() => { logout(); router.push('/login'); }}
            className="flex items-center text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-2" /> Logout
          </button>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
          <div className="bg-indigo-100 p-4 rounded-full mb-4">
            <MapPin className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700">Passenger Dashboard Setup Complete</h2>
          <p className="text-gray-500 mt-2">The map and ride requesting functionality will be built in the next phase!</p>
        </div>
      </div>
    </div>
  );
}
