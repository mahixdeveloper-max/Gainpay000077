import React, { useState } from "react";
import { ChevronLeft, Send, ShoppingCart, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { UserProfile, AppSettings } from "../types";
import { db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion, increment, addDoc, collection, query, where, onSnapshot } from "firebase/firestore";

interface EventCenterProps {
  profile: UserProfile | null;
  settings: AppSettings | null;
}

export default function EventCenter({ profile, settings }: EventCenterProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [hasPurchased5000, setHasPurchased5000] = useState(false);

  const openTelegram = (url: string) => {
    if (!url) return;
    // Force open in external browser (Chrome/Default) using Android Intent
    if (/Android/i.test(navigator.userAgent)) {
      const cleanUrl = url.replace(/^https?:\/\//, '');
      // This intent format specifically tells Android to open the URL in an external browser
      const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(url)};end`;
      window.location.href = intentUrl;
    } else {
      window.location.href = url;
    }
  };

  React.useEffect(() => {
    if (!profile) return;

    // Check if user has already completed the task in their profile
    if (profile.completedTasks?.includes("purchase_5000")) {
      setHasPurchased5000(true);
      return;
    }

    // Otherwise, check transactions for a buy >= 5000
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", profile.uid),
      where("type", "==", "buy"),
      where("status", "==", "completed"),
      where("amount", ">=", 5000)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      if (!snap.empty && !profile.completedTasks?.includes("purchase_5000")) {
        setHasPurchased5000(true);
        // Auto-update profile if found
        try {
          await updateDoc(doc(db, "users", profile.uid), {
            completedTasks: arrayUnion("purchase_5000")
          });
        } catch (e) {
          console.error("Error auto-completing purchase task:", e);
        }
      }
    }, (error) => {
      console.error("Error checking purchase task:", error);
    });

    return () => unsubscribe();
  }, [profile]);

  const rewards = [
    { 
      id: "subscribe",
      name: "Subscribe to Official Channel", 
      icon: Send, 
      color: "text-blue-500", 
      bg: "bg-blue-50", 
      status: profile?.completedTasks?.includes("subscribe") ? "Done" : "Pending",
      action: () => openTelegram(settings?.telegramChannelUrl || "https://t.me/gainpayofficialchanel"),
      autoComplete: true
    },
    { 
      id: "join_vip",
      name: "Join VIP Group", 
      icon: Send, 
      color: "text-blue-400", 
      bg: "bg-blue-50", 
      status: profile?.completedTasks?.includes("join_vip") ? "Done" : "Pending",
      action: () => openTelegram(settings?.telegramGroupUrl || "https://t.me/gainpayy"),
      autoComplete: true
    },
    { 
      id: "purchase_5000",
      name: "Purchase 5000 IToken", 
      icon: ShoppingCart, 
      color: "text-yellow-500", 
      bg: "bg-yellow-50", 
      status: (profile?.completedTasks?.includes("purchase_5000") || hasPurchased5000) ? "Done" : "Pending",
      action: () => navigate("/buy"),
      autoComplete: false
    },
  ];

  const allTasksDone = rewards.every(r => r.status === "Done");
  const bonusClaimed = profile?.bonusClaimed || false;

  const handleCompleteTask = async (reward: typeof rewards[0]) => {
    if (!profile) return;
    if (profile.completedTasks?.includes(reward.id)) return;

    if (reward.autoComplete) {
      setLoading(reward.id);
      try {
        if (reward.action) reward.action();
        
        await updateDoc(doc(db, "users", profile.uid), {
          completedTasks: arrayUnion(reward.id)
        });
      } catch (error) {
        console.error("Error completing task:", error);
      } finally {
        setLoading(null);
      }
    } else {
      // Just perform the action (e.g. navigate to buy)
      if (reward.action) reward.action();
    }
  };

  const handleClaimBonus = async () => {
    if (!profile || !allTasksDone || bonusClaimed) return;

    setLoading("claim");
    try {
      const bonusAmount = 200;
      
      // 1. Update user balance and bonusClaimed status
      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(bonusAmount),
        bonusClaimed: true
      });

      // 2. Add reward transaction
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        type: "reward",
        amount: bonusAmount,
        status: "completed",
        createdAt: Date.now(),
        description: "Newbie Rewards Bonus"
      });

      alert(`Congratulations! You've claimed your ₹${bonusAmount} bonus!`);
    } catch (error) {
      console.error("Error claiming bonus:", error);
      alert("Failed to claim bonus. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between relative bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight">Newbie Rewards</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="p-4 space-y-6">
        {/* Bonus Card */}
        <div className={cn(
          "rounded-3xl p-6 text-white shadow-xl relative overflow-hidden transition-all duration-500",
          bonusClaimed ? "bg-gray-400 shadow-none" : "bg-blue-600 shadow-blue-200"
        )}>
          <div className="relative z-10 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total bonus</p>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-bold shadow-inner">
                  ₹
                </div>
                <span className="text-3xl font-black tracking-tighter">200</span>
              </div>
            </div>
            <button 
              onClick={handleClaimBonus}
              disabled={!allTasksDone || bonusClaimed || loading === "claim"}
              className={cn(
                "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all active:scale-95",
                bonusClaimed 
                  ? "bg-white/20 border-white/10 text-white/50 cursor-not-allowed" 
                  : allTasksDone
                    ? "bg-yellow-400 border-yellow-300 text-yellow-900 shadow-lg shadow-yellow-400/20 animate-pulse"
                    : "bg-white/10 border-white/20 text-white cursor-not-allowed"
              )}
            >
              {loading === "claim" ? "..." : bonusClaimed ? "Received" : allTasksDone ? "Claim Now" : "Pending"}
            </button>
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl" />
        </div>

        {/* Rewards List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tasks to complete</h2>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              {rewards.filter(r => r.status === "Done").length} / {rewards.length} Done
            </span>
          </div>
          
          {rewards.map((reward, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center space-x-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", reward.bg, reward.color)}>
                  <reward.icon size={24} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-tight leading-tight block">
                    {reward.name}
                  </span>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {reward.status === "Done" ? "Completed" : "Incomplete"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {reward.status === "Done" ? (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-50 text-green-500">
                    <CheckCircle2 size={24} />
                  </div>
                ) : (
                  <button 
                    onClick={() => handleCompleteTask(reward)}
                    disabled={loading === reward.id}
                    className="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-100 active:scale-90 transition-all"
                  >
                    {loading === reward.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight size={20} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Card */}
        {!bonusClaimed && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start space-x-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-orange-900 uppercase tracking-tight">How to claim?</p>
              <p className="text-[10px] font-bold text-orange-700 leading-relaxed">
                Complete all {rewards.length} tasks listed above. Once all tasks are marked as "Done", the "Claim Now" button in the top card will be activated.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
