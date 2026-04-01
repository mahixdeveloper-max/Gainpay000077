import { UserProfile } from "../types";
import { ChevronRight, Copy, QrCode, User, Users as UsersIcon, TrendingUp, DollarSign, Award, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";

interface TeamProps {
  profile: UserProfile | null;
}

export default function Team({ profile }: TeamProps) {
  const [teamCount, setTeamCount] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const inviteUrl = `${window.location.origin}/register?ref=${profile?.referralCode || ""}`;

  useEffect(() => {
    if (!profile?.referralCode || !profile?.uid) return;

    // Fetch team count (Level 1)
    const qTeam = query(collection(db, "users"), where("referredBy", "==", profile.referralCode));
    const unsubTeam = onSnapshot(qTeam, (snapshot) => {
      setTeamCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching team count:", error);
    });

    // Fetch total commission
    const qComm = query(
      collection(db, "transactions"), 
      where("userId", "==", profile.uid),
      where("type", "==", "commission")
    );
    const unsubComm = onSnapshot(qComm, (snapshot) => {
      const total = snapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
      setTotalCommission(total);
    }, (error) => {
      console.error("Error fetching team commissions:", error);
    });

    return () => {
      unsubTeam();
      unsubComm();
    };
  }, [profile]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-center relative bg-white sticky top-0 z-10 shadow-sm">
        <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight">Team</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* User Info Card */}
        <div className="flex items-center space-x-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-4 border-white shadow-md">
            <User size={32} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex justify-between items-center">
              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{profile?.phone || "User"}</p>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Reward:4.5%</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">ID: {profile?.uid?.slice(0, 8)}</p>
              <div className="flex items-center space-x-1 bg-blue-600 text-white px-2 py-0.5 rounded-full">
                <span className="text-[8px] font-black uppercase tracking-widest">Code: {profile?.referralCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <UsersIcon size={20} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Count</p>
            <p className="text-xl font-black text-gray-900 tracking-tighter">{teamCount}</p>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <DollarSign size={20} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Commission</p>
            <p className="text-xl font-black text-gray-900 tracking-tighter">₹{totalCommission.toFixed(2)}</p>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="space-y-3">
          <div className="flex justify-between items-center p-5 bg-white rounded-3xl border border-gray-100 shadow-sm group hover:bg-gray-50 transition-all">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                <TrendingUp size={20} />
              </div>
              <p className="text-xs font-black text-gray-800 uppercase tracking-tight">My Total Profit</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black text-blue-600">₹0.00</span>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>

          <div className="flex justify-between items-center p-5 bg-white rounded-3xl border border-gray-100 shadow-sm group hover:bg-gray-50 transition-all">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <Award size={20} />
              </div>
              <p className="text-xs font-black text-gray-800 uppercase tracking-tight">Invite Rewards</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </div>

          <div className="flex justify-between items-center p-5 bg-white rounded-3xl border border-gray-100 shadow-sm group hover:bg-gray-50 transition-all">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600">
                <Clock size={20} />
              </div>
              <p className="text-xs font-black text-gray-800 uppercase tracking-tight">Yesterday Team</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black text-blue-600">₹0.00</span>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>
        </div>

        {/* Today Commission Progress */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Today Commission</p>
            <span className="text-sm font-black text-orange-500 italic">₹0.00</span>
          </div>
          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000" />
          </div>
          <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span>0</span>
            <span className="text-blue-600">Daily Tasks 0%</span>
            <span>500</span>
          </div>
        </div>

        {/* Invitation Link Card */}
        <div className="bg-gray-900 rounded-[2.5rem] p-8 border border-gray-800 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Invite Friends</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Share & Earn Commission</p>
              </div>
              <button 
                onClick={() => setShowQR(!showQR)}
                className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-orange-500 border border-white/10 hover:bg-white/20 transition-all"
              >
                <QrCode size={24} />
              </button>
            </div>

            {showQR && (
              <div className="flex justify-center p-6 bg-white rounded-3xl animate-in fade-in zoom-in duration-300">
                <QRCodeSVG value={inviteUrl} size={150} />
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Your Invitation Link</p>
              <div className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 group">
                <p className="text-[10px] font-bold text-gray-300 truncate flex-1 mr-4">
                  {inviteUrl}
                </p>
                <button 
                  onClick={() => copyToClipboard(inviteUrl)}
                  className="p-2 text-blue-400 hover:text-blue-300 transition-colors relative"
                >
                  <Copy size={18} />
                  {copySuccess && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter">Copied!</span>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 text-[10px] font-black">L1</div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  Level 1 Commission = Buy * <span className="text-orange-500">0.3 %</span>
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 text-[10px] font-black">L2</div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  Level 2 Commission = Buy * <span className="text-orange-500">0.1 %</span>
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 text-[10px] font-black">L3</div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  Level 3 Commission = Buy * <span className="text-orange-500">0.0 %</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
