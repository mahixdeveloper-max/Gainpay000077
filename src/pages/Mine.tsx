import { UserProfile } from "../types";
import { ChevronRight, User, Wallet, TrendingUp, History, Calendar, Play, Headphones, Lock, LogOut, ShieldCheck, X, CheckCircle2, AlertCircle } from "lucide-react";
import { auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { signOut, updatePassword } from "firebase/auth";
import { Link } from "react-router-dom";
import React, { useState } from "react";

interface MineProps {
  profile: UserProfile | null;
}

export default function Mine({ profile }: MineProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setMessage({ type: "success", text: "Password updated successfully!" });
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setShowPasswordModal(false), 2000);
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to update password" });
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { name: "IToken", value: profile?.balance?.toFixed(2) || "0.00", icon: Wallet, color: "text-green-600", bg: "bg-green-50", path: "/history" },
    { name: "Today Profit", value: "0", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-50", path: "/history" },
    { name: "UPI Sell History", icon: History, color: "text-blue-500", bg: "bg-blue-50", path: "/history" },
    { name: "Buy History", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", path: "/history" },
    { name: "Transfer IToken History", icon: History, color: "text-blue-400", bg: "bg-blue-50", path: "/history" },
    { name: "Event Center", icon: Calendar, color: "text-orange-500", bg: "bg-orange-50", path: "/event-center" },
    { name: "Official Service", icon: Headphones, color: "text-blue-600", bg: "bg-blue-50", onClick: () => setShowSupportModal(true) },
    { name: "Modify Password", icon: Lock, color: "text-blue-400", bg: "bg-blue-50", onClick: () => setShowPasswordModal(true) },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-center relative bg-white sticky top-0 z-10 shadow-sm">
        <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight">Mine</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* User Profile Card */}
        <div className="flex items-center space-x-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-4 border-white shadow-md">
            <User size={40} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{profile?.phone || "6491643491"}</p>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Reward:4.5%</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">ID: {profile?.uid?.slice(0, 8) || "974973657"}</p>
              <ChevronRight size={20} className="text-gray-300" />
            </div>
          </div>
        </div>

        {/* Admin Panel Link */}
        {profile?.role === "admin" && (
          <Link
            to="/admin/dashboard"
            className="flex items-center justify-between p-5 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl group hover:scale-[1.02] transition-all"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-white uppercase tracking-tight">Dashboard</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Management Portal</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
          </Link>
        )}

        {/* Menu Items */}
        <div className="space-y-1">
          {menuItems.map((item) => {
            const content = (
              <div className="flex items-center justify-between p-4 bg-white rounded-xl hover:bg-gray-50 transition-colors group w-full text-left">
                <div className="flex items-center space-x-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", item.bg, item.color)}>
                    <item.icon size={20} />
                  </div>
                  <span className="text-sm font-black text-gray-800 uppercase tracking-tight">{item.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  {item.value && (
                    <span className={cn("text-sm font-black tracking-tighter", item.color)}>
                      {item.value}
                    </span>
                  )}
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                </div>
              </div>
            );

            if (item.path) {
              return (
                <Link key={item.name} to={item.path}>
                  {content}
                </Link>
              );
            }

            return (
              <button key={item.name} onClick={item.onClick} className="w-full">
                {content}
              </button>
            );
          })}
        </div>

        {/* Sign Out Button */}
        <div className="pt-4 pb-8 space-y-6">
          <button
            onClick={handleSignOut}
            className="w-full bg-white text-gray-800 py-5 rounded-2xl text-sm font-black border border-gray-200 shadow-sm flex items-center justify-center space-x-3 active:bg-gray-50 transition-all"
          >
            <LogOut size={18} className="text-red-500" />
            <span className="uppercase tracking-widest">Sign Out</span>
          </button>

          <div className="text-center space-y-3">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">APP Version : 1.0.1</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">
              Haven't downloaded the APK? <Link to="#" className="text-blue-600 underline">Click here and Download now</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight italic">Modify Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Min 6 characters"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Repeat new password"
                    required
                  />
                </div>

                {message && (
                  <div className={cn("p-4 rounded-2xl flex items-center space-x-3", message.type === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                    {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <p className="text-[10px] font-black uppercase tracking-tight">{message.text}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl text-xs font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 uppercase tracking-widest"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight italic">Official Support</h3>
                <button onClick={() => setShowSupportModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <Headphones size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Customer Service</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Online 24/7</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 leading-relaxed">
                      For any issues regarding deposits, withdrawals, or account security, please contact our official support team on Telegram.
                    </p>
                    <a 
                      href="https://t.me/gainpay_support" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full bg-white text-blue-600 py-3 rounded-xl text-[10px] font-black text-center border border-blue-100 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest"
                    >
                      Contact @gainpay_support
                    </a>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Support</p>
                  <p className="text-xs font-black text-gray-800">support@gainpay.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
