import React from "react";
import { ChevronLeft, Send, Users, Play, Link as LinkIcon, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { UserProfile } from "../types";

interface EventCenterProps {
  profile: UserProfile | null;
}

export default function EventCenter({ profile }: EventCenterProps) {
  const navigate = useNavigate();

  const rewards = [
    { name: "Subscribe to Official Channel", icon: Send, color: "text-blue-500", bg: "bg-blue-50", status: profile?.completedTasks?.includes("subscribe") ? "Done" : "Pending" },
    { name: "Join VIP Group", icon: Send, color: "text-blue-400", bg: "bg-blue-50", status: profile?.completedTasks?.includes("join_vip") ? "Done" : "Pending" },
    { name: "Watch Beginner Tutorial", icon: Play, color: "text-blue-600", bg: "bg-blue-50", status: profile?.completedTasks?.includes("tutorial") ? "Done" : "Pending" },
    { name: "Link Mobikwik", icon: LinkIcon, color: "text-orange-500", bg: "bg-orange-50", status: profile?.completedTasks?.includes("link_mobikwik") ? "Done" : "Pending" },
    { name: "Purchase 5000 IToken", icon: ShoppingCart, color: "text-yellow-500", bg: "bg-yellow-50", status: profile?.completedTasks?.includes("purchase_5000") ? "Done" : "Pending" },
  ];

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
        <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
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
            <button className="bg-gray-600/50 backdrop-blur-md px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/20">
              Received
            </button>
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl" />
        </div>

        {/* Rewards List */}
        <div className="space-y-4">
          {rewards.map((reward, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center space-x-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", reward.bg, reward.color)}>
                  <reward.icon size={24} />
                </div>
                <span className="text-xs font-black text-gray-800 uppercase tracking-tight leading-tight max-w-[150px]">
                  {reward.name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={cn("text-[10px] font-black uppercase tracking-widest", reward.status === "Done" ? "text-green-500" : "text-gray-400")}>
                  {reward.status}
                </span>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm", reward.status === "Done" ? "bg-green-500" : "bg-gray-200")}>
                  <CheckCircle2 size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
