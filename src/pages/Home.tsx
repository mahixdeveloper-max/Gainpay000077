import { UserProfile, AppSettings, Transaction } from "../types";
import { Bell, ChevronRight, Headphones, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, increment } from "firebase/firestore";
import { cn } from "../lib/utils";

interface HomeProps {
  profile: UserProfile | null;
  settings: AppSettings | null;
}

export default function Home({ profile, settings }: HomeProps) {
  const [todayProfit, setTodayProfit] = useState(0);

  useEffect(() => {
    if (!profile || !settings) return;

    const today = new Date().toLocaleDateString();
    if (profile.lastProfitDate === today) return;

    const generateDailyProfit = async () => {
      try {
        // Calculate 5% of balance as daily profit
        const rewardPercent = settings.globalRewardPercent || 5;
        const profitAmount = profile.balance * (rewardPercent / 100);

        if (profitAmount > 0) {
          // 1. Update user balance and last profit date
          await updateDoc(doc(db, "users", profile.uid), {
            balance: increment(profitAmount),
            lastProfitDate: today
          });

          // 2. Add reward transaction
          await addDoc(collection(db, "transactions"), {
            userId: profile.uid,
            type: "reward",
            amount: profitAmount,
            status: "completed",
            createdAt: Date.now(),
            description: `Daily Profit (${rewardPercent}%)`
          });
        } else {
          // Even if profit is 0, update the date so we don't keep checking
          await updateDoc(doc(db, "users", profile.uid), {
            lastProfitDate: today
          });
        }
      } catch (error) {
        console.error("Error generating daily profit:", error);
      }
    };

    generateDailyProfit();
  }, [profile, settings]);

  useEffect(() => {
    if (!profile) return;

    let unsubscribe: (() => void) | undefined;
    let currentStartOfDay = new Date();
    currentStartOfDay.setHours(0, 0, 0, 0);

    const startListening = () => {
      if (unsubscribe) unsubscribe();

      const q = query(
        collection(db, "transactions"),
        where("userId", "==", profile.uid),
        where("createdAt", ">=", currentStartOfDay.getTime())
      );

      unsubscribe = onSnapshot(q, (snap) => {
        console.log("Transactions found:", snap.docs.length);
        const total = snap.docs.reduce((acc, doc) => {
          const tx = doc.data() as Transaction;
          console.log("Transaction:", tx.type, tx.amount, tx.createdAt);
          if (tx.type === "reward" || tx.type === "commission") {
            return acc + tx.amount;
          }
          return acc;
        }, 0);
        setTodayProfit(total);
      }, (error) => {
        console.error("Error fetching today profit:", error);
      });
    };

    startListening();

    // Check for midnight reset
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getTime() >= currentStartOfDay.getTime() + 24 * 60 * 60 * 1000) {
        currentStartOfDay = new Date();
        currentStartOfDay.setHours(0, 0, 0, 0);
        startListening();
      }
    }, 60000); // Check every minute

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [profile]);

  return (
    <div className="flex flex-col space-y-4 p-4">
      {/* Banner */}
      <div className="relative rounded-xl overflow-hidden shadow-lg h-48 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
        <img 
          src={settings?.bannerUrl || "https://picsum.photos/seed/gainpay-banner/800/400"} 
          alt="Banner" 
          className="w-full h-full object-cover opacity-60"
          referrerPolicy="no-referrer"
        />
        {!settings?.bannerUrl && (
          <div className="absolute inset-0 flex flex-col justify-center p-6 text-white">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
              Lucky Draw for Active Users
            </h2>
            <p className="text-[10px] mt-2 font-bold opacity-80 uppercase tracking-widest">
              Participate & Win Big! Enter the Voice & Video Prize Draw.
            </p>
            <div className="mt-4 flex space-x-2">
              <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase">
                1st Place 1,000 Tokens
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">My IToken</h3>
            <p className="text-[10px] text-gray-900 font-black uppercase tracking-tight">{profile?.phone || "N/A"}</p>
            <p className="text-[10px] text-gray-400">1 Rs = 1 IToken, 1 USDT ≈ 107 IToken</p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 shadow-sm">
              <img src="https://flagcdn.com/w80/in.png" alt="India" className="w-full h-full object-cover" />
            </div>
            <span className="text-4xl font-black text-gray-900 tracking-tighter">
              {profile?.balance?.toFixed(2) || "0.00"}
            </span>
          </div>
          <Link 
            to="/buy" 
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-sm shadow-lg shadow-blue-200 flex items-center space-x-2 hover:bg-blue-700 transition-all active:scale-95"
          >
            <span className="text-lg">₹</span>
            <span>Buy</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
          <div className="space-y-1">
            <p className="text-gray-400 text-[10px] font-bold uppercase">Today Profit</p>
            <p className="text-lg font-black text-gray-900">₹{todayProfit.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-400 text-[10px] font-bold uppercase">Reward</p>
            <p className="text-lg font-black text-blue-600 italic">{settings?.globalRewardPercent || 4.5}%</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link to="/history" className="bg-gray-50 text-gray-700 py-3 rounded-xl text-xs font-black text-center border border-gray-100 active:bg-gray-100 transition-colors">
            Buy History
          </Link>
          <Link to="/history" className="bg-gray-50 text-gray-700 py-3 rounded-xl text-xs font-black text-center border border-gray-100 active:bg-gray-100 transition-colors">
            Sell History
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-gray-400 text-[10px] font-bold uppercase">Auto Selling</p>
            <p className="text-xs font-black text-gray-900">Sell Set</p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-400 text-[10px] font-bold uppercase">Sell Faster</p>
            <Link to="/upi" className="text-xs font-black text-blue-600 underline">Link Upi</Link>
          </div>
        </div>
      </div>

      {/* Official Links */}
      <div className="grid grid-cols-2 gap-4">
        <a 
          href={settings?.telegramGroupUrl || "https://t.me/gainpayy"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Bell size={16} className="text-gray-400" />
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Official Group</span>
          </div>
          <ChevronRight size={14} className="text-gray-300" />
        </a>

        <a 
          href={settings?.telegramChannelUrl || "https://t.me/gainpayofficialchanel"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Send size={16} className="text-gray-400" />
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Official Channel</span>
          </div>
          <ChevronRight size={14} className="text-gray-300" />
        </a>
      </div>

      {/* News */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">News</h3>
          <Link to="#" className="text-gray-400 text-[10px] font-bold flex items-center uppercase">
            More <ChevronRight size={12} />
          </Link>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-xs font-black text-gray-800 flex items-center space-x-2">
              <span>🔒</span>
              <span>How to ensure the safety of funds.</span>
            </h4>
            <p className="text-[10px] text-gray-400 font-medium">2026-01-24 15:17:05</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black text-gray-800 flex items-center space-x-2">
              <span>Gainpay - Conditions for automatic token sell? ❓</span>
            </h4>
            <p className="text-[10px] text-gray-400 font-medium">2026-01-24 15:14:43</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black text-gray-800 flex items-center space-x-2">
              <span>Gainpay - The correct way to buy an order? ❓</span>
            </h4>
            <p className="text-[10px] text-gray-400 font-medium">2025-03-21 19:54:18</p>
          </div>
        </div>
      </div>

      {/* Floating Support */}
      <div className="fixed bottom-24 right-6 bg-white p-3 rounded-full shadow-2xl border border-blue-50 z-40 animate-bounce">
        <Headphones className="text-blue-600" size={24} />
      </div>
    </div>
  );
}
