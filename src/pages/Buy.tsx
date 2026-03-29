import React, { useState } from "react";
import { UserProfile } from "../types";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Search, ChevronUp, ChevronDown, Globe, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

interface BuyProps {
  profile: UserProfile | null;
}

export default function Buy({ profile }: BuyProps) {
  const [activeTab, setActiveTab] = useState<"UPI" | "USDT">("UPI");
  const [amount, setAmount] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const handleBuyClick = (amt: number) => {
    setSelectedAmount(amt);
    setShowConfirmModal(true);
  };

  const handleConfirmBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !utr) return;

    setLoading(true);
    const path = "buyRequests";
    try {
      await addDoc(collection(db, path), {
        userId: profile.uid,
        amount: selectedAmount,
        status: "pending",
        utr: utr,
        createdAt: Date.now(),
      });
      setSuccess(true);
      setTimeout(() => {
        setShowConfirmModal(false);
        setSuccess(false);
        setUtr("");
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-center relative bg-white sticky top-0 z-10">
        <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight">Buy</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-50 bg-white sticky top-12 z-10">
        <button
          onClick={() => setActiveTab("UPI")}
          className={cn(
            "flex-1 py-4 text-xs font-black transition-all duration-200 uppercase tracking-widest",
            activeTab === "UPI" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"
          )}
        >
          UPI
        </button>
        <button
          onClick={() => setActiveTab("USDT")}
          className={cn(
            "flex-1 py-4 text-xs font-black transition-all duration-200 uppercase tracking-widest",
            activeTab === "USDT" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"
          )}
        >
          USDT
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === "UPI" ? (
          <div className="space-y-6">
            {/* UPI Tab Content */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center space-x-2">
                <ChevronUp size={16} className="text-blue-600" />
                <ChevronDown size={16} className="text-blue-600" />
                <span className="text-xs font-black text-gray-700 uppercase tracking-tighter">Min 100</span>
                <span className="text-xs font-black text-gray-700 uppercase tracking-tighter ml-4">Max 100000</span>
              </div>
              <Search size={16} className="text-yellow-500" />
            </div>

            <div className="space-y-4">
              {[300, 500, 1000, 2000, 5000].map((amt) => (
                <div key={amt} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>No:{Math.floor(Math.random() * 10000000000000000)}</span>
                    <span>Reward 4.5%</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-red-600 uppercase">Price</p>
                        <p className="text-lg font-black text-red-600 tracking-tighter">₹ {amt}</p>
                      </div>
                      <span className="text-gray-300 font-bold">+</span>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-500 uppercase">Reward</p>
                        <p className="text-lg font-black text-gray-800 tracking-tighter">{(amt * 0.045).toFixed(1)}</p>
                      </div>
                      <span className="text-gray-300 font-bold">=</span>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-blue-600 uppercase">Itoken</p>
                        <p className="text-lg font-black text-blue-600 tracking-tighter">{(amt * 1.045).toFixed(2)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleBuyClick(amt)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-black shadow-lg shadow-blue-100 active:scale-95 transition-all"
                    >
                      Buy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 flex flex-col items-center">
            {/* USDT Tab Content */}
            <div className="text-center space-y-1">
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">1 USDT ≈ 107 IToken</p>
            </div>

            <div className="w-full relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-black text-[10px]">T</div>
              </div>
              <input 
                type="number" 
                placeholder="Enter the quantity" 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 pl-12 pr-20 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                ≈ {(Number(amount) * 107).toFixed(2)} IToken
              </div>
            </div>

            <div className="w-full bg-orange-50 border border-orange-100 p-3 rounded-lg flex items-center space-x-3">
              <span className="text-orange-500">🎫</span>
              <p className="text-orange-600 text-[10px] font-black uppercase tracking-tight">Please enter the value you want buy</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-50 flex flex-col items-center space-y-4">
              <div className="p-2 bg-white rounded-xl border-4 border-gray-900">
                <QRCodeSVG value={profile?.walletAddress || "TARxwtXK8bJ87r6CG9AiXAxVrKvL1Lwqkq"} size={180} />
              </div>
              <p className="text-orange-600 text-[10px] font-black text-center leading-tight uppercase tracking-tight">
                Send Only USDT to this deposit address.
              </p>
            </div>

            <div className="w-full space-y-6">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="space-y-1">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Wallet Address</p>
                  <p className="text-xs font-black text-gray-800 break-all leading-relaxed">
                    {profile?.walletAddress || "TARxwtXK8bJ87r6CG9AiXAxVrKvL1Lwqkq"}
                  </p>
                </div>
                <button 
                  onClick={() => copyToClipboard(profile?.walletAddress || "TARxwtXK8bJ87r6CG9AiXAxVrKvL1Lwqkq")}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Copy size={18} />
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="space-y-1">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Network</p>
                  <p className="text-xs font-black text-gray-800">Tron(TRC20)</p>
                </div>
                <Globe size={18} className="text-gray-400" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="bg-white text-gray-700 py-4 rounded-xl text-xs font-black border border-gray-200 shadow-sm flex items-center justify-center space-x-2 active:bg-gray-50 transition-all">
                  <Download size={14} />
                  <span>Save Image</span>
                </button>
                <button 
                  onClick={() => copyToClipboard(profile?.walletAddress || "TARxwtXK8bJ87r6CG9AiXAxVrKvL1Lwqkq")}
                  className="bg-blue-600 text-white py-4 rounded-xl text-xs font-black shadow-lg shadow-blue-100 active:scale-95 transition-all"
                >
                  Copy Address
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UPI Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 relative overflow-hidden">
            {success ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                  <CheckCircle2 size={40} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Request Submitted</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Admin will verify your payment soon.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Confirm UPI Payment</h3>
                  <button onClick={() => setShowConfirmModal(false)} className="text-gray-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl space-y-2">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest text-center">Pay to Admin UPI</p>
                  <div className="flex items-center justify-center space-x-2">
                    <p className="text-lg font-black text-blue-600 tracking-tight">6491643491@upi</p>
                    <button onClick={() => copyToClipboard("6491643491@upi")} className="text-blue-400">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Amount to Pay</span>
                    <span className="text-lg font-black text-gray-900 tracking-tight">₹ {selectedAmount}</span>
                  </div>

                  <form onSubmit={handleConfirmBuy} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Enter UTR Number</label>
                      <input
                        type="text"
                        placeholder="12-digit UTR number"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="bg-orange-50 p-3 rounded-xl flex items-start space-x-2">
                      <AlertCircle size={14} className="text-orange-500 mt-0.5 shrink-0" />
                      <p className="text-[9px] font-bold text-orange-600 uppercase leading-relaxed">
                        Please double check the UTR number. Incorrect UTR will lead to rejection of your request.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !utr}
                      className="w-full bg-blue-600 text-white py-4 rounded-xl text-xs font-black shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
                    >
                      {loading ? "Submitting..." : "I Have Paid"}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronRight({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
