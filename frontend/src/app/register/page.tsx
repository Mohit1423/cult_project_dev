'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CarFront, Lock, Mail, User, Phone, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('PASSENGER');
  
  // Driver specific fields
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const payload: any = { email, password, name, phone, role };
      if (role === 'DRIVER') {
        payload.vehicle = { make, model, licensePlate };
      }

      const res = await api.post('/auth/register', payload);
      login(res.data.token, res.data.user);
      router.push(res.data.user.role === 'DRIVER' ? '/driver' : '/passenger');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-xl border border-white/20"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-500 p-3 rounded-full mb-4">
            <CarFront className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-gray-300 mt-2">Join the campus mobility platform</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-6 text-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="flex justify-center space-x-4 mb-6">
            <button
              type="button"
              onClick={() => setRole('PASSENGER')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${role === 'PASSENGER' ? 'bg-indigo-600 text-white' : 'bg-black/30 text-gray-300 hover:bg-black/50'}`}
            >
              Passenger
            </button>
            <button
              type="button"
              onClick={() => setRole('DRIVER')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${role === 'DRIVER' ? 'bg-indigo-600 text-white' : 'bg-black/30 text-gray-300 hover:bg-black/50'}`}
            >
              Driver
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl leading-5 bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl leading-5 bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  placeholder="+91 9876543210"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl leading-5 bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  placeholder="you@iitr.ac.in"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl leading-5 bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          {role === 'DRIVER' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 pt-4 border-t border-white/20"
            >
              <h3 className="text-lg font-medium text-white flex items-center">
                <Briefcase className="w-5 h-5 mr-2" /> Vehicle Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Make</label>
                  <input
                    type="text"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="block w-full px-3 py-3 border border-white/20 rounded-xl leading-5 bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    placeholder="E-Rickshaw"
                    required={role === 'DRIVER'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="block w-full px-3 py-3 border border-white/20 rounded-xl leading-5 bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Pro V2"
                    required={role === 'DRIVER'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">License Plate</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="block w-full px-3 py-3 border border-white/20 rounded-xl leading-5 bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    placeholder="UK 17 AB 1234"
                    required={role === 'DRIVER'}
                  />
                </div>
              </div>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 mt-8"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </motion.button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in here
          </a>
        </p>
      </motion.div>
    </div>
  );
}
