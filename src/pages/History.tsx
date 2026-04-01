import React, { useState, useEffect } from "react";
import { UserProfile, BuyRequest, SellRequest } from "../types";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { ChevronLeft, ShoppingCart, CreditCard, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

interface HistoryProps {
  profile: UserProfile | null;
}

export default function History({ profile }: HistoryProps) {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [buyHistory, setBuyHistory] = useState<BuyRequest[]>([]);
  const [sellHistory, setSellHistory] = useState<SellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;

    const buyQuery = query(
      collection(db, "buyRequests"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc")
    );

    const sellQuery = query(
      collection(db, "sellRequests"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc")
    );

    const unsubBuy = onSnapshot(buyQuery, (snap) => {
      setBuyHistory(snap.docs.map(d => ({ ...d.data(), id: d.id } as BuyRequest)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching buy history:", error);
      setLoading(false);
    });

    const unsubSell = onSnapshot(sellQuery, (snap) => {
      setSellHistory(snap.docs.map(d => ({ ...d.data(), id: d.id } as SellRequest)));
    }, (error) => {
      console.error("Error fetching sell history:", error);
    });

    return () => {
      unsubBuy();
      unsubSell();
    };
  }, [profile]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 size={16} className="text-green-500" />;
      case "rejected": return <XCircle size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-orange-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-50 text-green-600";
      case "rejected": return "bg-red-50 text-red-600";
      default: return "bg-orange-50 text-orange-600";
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-100 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-sm font-black text-gray-900 uppercase tracking-tight mr-8">Transaction History</h1>
      </div>

      {/* Tabs */}
      <div className="flex p-4 bg-white border-b border-gray-100">
        <button
          onClick={() => setActiveTab("buy")}
          className={cn(
            "flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-center space-x-2",
            activeTab === "buy" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400 hover:bg-gray-50"
          )}
        >
          <ShoppingCart size={16} />
          <span>Buy History</span>
        </button>
        <button
          onClick={() => setActiveTab("sell")}
          className={cn(
            "flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-center space-x-2",
            activeTab === "sell" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400 hover:bg-gray-50"
          )}
        >
          <CreditCard size={16} />
          <span>Sell History</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === "buy" ? (
          buyHistory.length > 0 ? (
            buyHistory.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <ShoppingCart size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Buy IToken</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-600">₹{item.amount.toFixed(2)}</p>
                    <div className={cn("inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mt-1", getStatusColor(item.status))}>
                      {getStatusIcon(item.status)}
                      <span>{item.status}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">UTR: {item.utr}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 text-xs font-black uppercase tracking-widest">No buy history found</div>
          )
        ) : (
          sellHistory.length > 0 ? (
            sellHistory.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Sell IToken</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-red-600">-₹{item.amount.toFixed(2)}</p>
                    <div className={cn("inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mt-1", getStatusColor(item.status))}>
                      {getStatusIcon(item.status)}
                      <span>{item.status}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">UPI: {item.upiId}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 text-xs font-black uppercase tracking-widest">No sell history found</div>
          )
        )}
      </div>
    </div>
  );
}
