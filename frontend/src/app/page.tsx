'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Zap, Shield, Map, Clock, Wallet, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 inset-x-0 flex justify-center overflow-hidden pointer-events-none z-0">
        <div className="w-[800px] h-[500px] bg-indigo-600/20 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-3">
          <Image src="/my_logo.png" alt="Campus Mobility Logo" width={48} height={48} className="rounded-xl shadow-lg" />
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">
            CampusMobility
          </span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-5 py-2.5 text-sm font-medium hover:text-indigo-300 transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="px-5 py-2.5 text-sm font-medium bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
            <Zap className="w-4 h-4" /> Version 2.0 is now live on campus!
          </div>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-6xl md:text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-indigo-100 to-indigo-500"
        >
          Campus Mobility,<br/>Reimagined.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl md:text-2xl text-indigo-200/70 max-w-3xl mb-12 font-light leading-relaxed"
        >
          The smartest, fastest, and most reliable way to connect passengers with e-rickshaws across the IIT Roorkee campus. Never wait in the heat again.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-5"
        >
          <Link href="/register" className="inline-flex justify-center items-center px-10 py-5 text-lg font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-500 hover:scale-105 transition-all shadow-[0_0_40px_rgba(79,70,229,0.4)]">
            Find a Ride Now
          </Link>
          <Link href="/register" className="inline-flex justify-center items-center px-10 py-5 text-lg font-bold text-indigo-300 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:scale-105 transition-all backdrop-blur-md">
            Register as a Driver
          </Link>
        </motion.div>
      </div>

      {/* Statistics Section */}
      <div className="relative border-y border-white/5 bg-black/20 backdrop-blur-sm py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/10">
          {[
            { label: 'Active Drivers', value: '150+' },
            { label: 'Daily Rides', value: '2,500+' },
            { label: 'Avg Wait Time', value: '< 3 Min' },
            { label: 'Campus Coverage', value: '100%' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-4xl md:text-5xl font-black text-white mb-2">{stat.value}</span>
              <span className="text-indigo-300/70 font-medium text-sm uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need for seamless transit.</h2>
          <p className="text-xl text-indigo-200/60 max-w-2xl mx-auto">Our platform replaces chaotic WhatsApp groups and street-hailing with a perfectly synchronized digital ecosystem.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: "Lightning Fast Dispatch", desc: "Our algorithm matches you with the nearest available e-rickshaw instantly." },
            { icon: Shield, title: "Verified Community", desc: "Every driver and passenger is a verified member of the campus to ensure total safety." },
            { icon: Map, title: "Live GPS Tracking", desc: "Watch your ride approach in real-time. No more guessing when they will arrive." },
            { icon: Clock, title: "Ride Scheduling", desc: "Got an early morning class? Schedule your ride up to 24 hours in advance." },
            { icon: Wallet, title: "Digital Payments", desc: "Pay seamlessly with UPI or campus wallets. No exact change required." },
            { icon: Users, title: "Carpooling", desc: "Share rides with peers heading in the same direction to save money and reduce traffic." }
          ].map((feature, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              key={i} 
              className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all hover:-translate-y-2 group cursor-default"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-indigo-200/60 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 mb-24 max-w-5xl mx-auto px-6">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl transform -skew-y-2 opacity-50 blur-lg z-0" />
        <div className="relative z-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12 text-center border border-white/20 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 blur-3xl rounded-full" />
          <h2 className="text-4xl font-black text-white mb-6">Ready to upgrade your daily commute?</h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">Join thousands of students and faculty already using our platform for a stress-free campus experience.</p>
          <Link href="/register" className="inline-flex justify-center items-center px-10 py-4 text-lg font-bold text-indigo-600 bg-white rounded-xl hover:bg-indigo-50 hover:scale-105 transition-all shadow-xl">
            Create Free Account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/40 py-12 text-center text-indigo-200/40 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Image src="/my_logo.png" alt="Campus Mobility Logo" width={32} height={32} className="opacity-50 grayscale rounded-lg" />
          <span className="text-lg font-bold">CampusMobility</span>
        </div>
        <p>© 2026 Campus Mobility Platform. Designed for IIT Roorkee.</p>
      </footer>
    </div>
  );
}
