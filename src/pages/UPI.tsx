import React, { useState } from "react";
import { UserProfile } from "../types";
import { Play, Link as LinkIcon, Inbox, CheckCircle2, X, CreditCard, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, updateDoc, collection, addDoc } from "firebase/firestore";

interface UPIProps {
  profile: UserProfile | null;
}

export default function UPI({ profile }: UPIProps) {
  const [activeTab, setActiveTab] = useState<"Buy" | "Sell">("Buy");
  const [isLinking, setIsLinking] = useState(false);
  const [upiId, setUpiId] = useState(profile?.upiId || "");
  const [loading, setLoading] = useState(false);
  
  // Sell states
  const [sellAmount, setSellAmount] = useState("");
  const [sellLoading, setSellLoading] = useState(false);
  const [sellSuccess, setSellSuccess] = useState(false);

  const handleLinkUPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!upiId.includes("@")) return alert("Please enter a valid UPI ID");

    setLoading(true);
    const path = `users/${profile.uid}`;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        upiId: upiId,
      });
      setIsLinking(false);
      alert("UPI ID linked successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!profile.upiId) return alert("Please link your UPI ID first!");

    // Check for restrictions
    if (profile.sellStatus === "stopped") {
      return alert("Your UPI selling is currently stopped by admin.");
    }
    if (profile.sellStatus === "waiting") {
      return alert("Your UPI selling is in waiting mode. Please try again later.");
    }
    if (profile.sellRestrictedUntil && profile.sellRestrictedUntil > Date.now()) {
      const remainingMs = profile.sellRestrictedUntil - Date.now();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return alert(`Selling is restricted for you. Please try again after ${remainingHours} hour(s).`);
    }
    
    const amount = Number(sellAmount);
    if (isNaN(amount) || amount < 100) return alert("Minimum sell amount is 100 IToken");
    if (amount > (profile.balance || 0)) return alert("Insufficient balance!");

    setSellLoading(true);
    const path = "sellRequests";
    try {
      await addDoc(collection(db, path), {
        userId: profile.uid,
        amount: amount,
        status: "pending",
        upiId: profile.upiId,
        createdAt: Date.now(),
      });
      setSellSuccess(true);
      setSellAmount("");
      setTimeout(() => setSellSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSellLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-center relative bg-white sticky top-0 z-10 shadow-sm">
        <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight">UPI</h1>
      </div>

      <div className="p-4 space-y-6">
        <div className="text-center">
          <p className="text-red-600 text-xs font-black uppercase tracking-tight">
            If you Change your upi id, please relink UPI .
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="bg-blue-400 text-white py-4 rounded-xl text-xs font-black shadow-lg shadow-blue-100 flex items-center justify-center space-x-2 active:scale-95 transition-all">
            <Play size={14} fill="currentColor" />
            <span>UPI Tutorial</span>
          </button>
          <button 
            onClick={() => setIsLinking(true)}
            className="bg-blue-600 text-white py-4 rounded-xl text-xs font-black shadow-lg shadow-blue-200 flex items-center justify-center space-x-2 active:scale-95 transition-all"
          >
            <LinkIcon size={14} />
            <span>Link New UPI</span>
          </button>
        </div>

        {/* Link UPI Modal/Form */}
        {isLinking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-6">
            <div className="bg-white w-full max-w-xs rounded-3xl p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Link UPI ID</h3>
                <button onClick={() => setIsLinking(false)} className="text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleLinkUPI} className="space-y-4">
                <input
                  type="text"
                  placeholder="e.g. name@upi"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl text-xs font-black shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
                >
                  {loading ? "Linking..." : "Confirm Link"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-50 bg-white">
          <button
            onClick={() => setActiveTab("Buy")}
            className={cn(
              "flex-1 py-4 text-xs font-black transition-all duration-200 uppercase tracking-widest",
              activeTab === "Buy" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"
            )}
          >
            Buy
          </button>
          <button
            onClick={() => setActiveTab("Sell")}
            className={cn(
              "flex-1 py-4 text-xs font-black transition-all duration-200 uppercase tracking-widest",
              activeTab === "Sell" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"
            )}
          >
            Sell
          </button>
        </div>

        {activeTab === "Buy" ? (
          profile?.upiId ? (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked UPI ID</p>
                    <p className="text-sm font-black text-gray-800">{profile.upiId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsLinking(true)}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest underline"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 opacity-60">
              <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-400 shadow-inner">
                <Inbox size={48} strokeWidth={1.5} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-black text-gray-800 uppercase tracking-tight">No UPI partners have been linked yet!</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Please Link New UPI.</p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {sellSuccess ? (
              <div className="bg-green-50 p-6 rounded-2xl flex flex-col items-center space-y-3 border border-green-100">
                <CheckCircle2 size={48} className="text-green-600" />
                <div className="text-center">
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Sell Request Submitted</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Your payment will be processed soon.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSellSubmit} className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Balance</p>
                    <p className="text-sm font-black text-blue-600 tracking-tight">₹ {profile?.balance?.toFixed(2) || "0.00"}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount to Sell (IToken)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400">₹</span>
                      <input
                        type="number"
                        placeholder="Min 100"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 pl-10 pr-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={sellAmount}
                        onChange={(e) => setSellAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {profile?.upiId && (
                    <div className="bg-blue-50 p-4 rounded-xl space-y-1">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Receiving UPI ID</p>
                      <p className="text-xs font-black text-blue-600">{profile.upiId}</p>
                    </div>
                  )}

                  <div className="bg-orange-50 p-3 rounded-xl flex items-start space-x-2">
                    <AlertCircle size={14} className="text-orange-500 mt-0.5 shrink-0" />
                    <p className="text-[9px] font-bold text-orange-600 uppercase leading-relaxed">
                      Withdrawal requests take 1-24 hours to process. Please ensure your UPI ID is correct.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={sellLoading || !sellAmount || !profile?.upiId}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl text-xs font-black shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest flex items-center justify-center space-x-2"
                  >
                    <CreditCard size={16} />
                    <span>{sellLoading ? "Processing..." : "Sell Now"}</span>
                  </button>
                  
                  {!profile?.upiId && (
                    <p className="text-[10px] font-black text-red-600 text-center uppercase tracking-tight">
                      Please link UPI ID to enable selling.
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
