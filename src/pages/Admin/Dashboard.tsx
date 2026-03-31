import { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { collection, query, getDocs, updateDoc, doc, onSnapshot, addDoc, increment, where, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { UserProfile, Transaction, BuyRequest, SellRequest, BuyOption } from "../../types";
import { Users, CreditCard, ShoppingCart, History, Check, X, Ban, Unlock, TrendingUp, LogOut, Settings, Save, Plus, Trash2, Package } from "lucide-react";
import { cn } from "../../lib/utils";
import { AppSettings } from "../../types";

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buyRequests, setBuyRequests] = useState<BuyRequest[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [buyOptions, setBuyOptions] = useState<BuyOption[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ 
    adminUpiId: "6491643491@upi",
    globalRewardPercent: 4.5,
    telegramChannelUrl: "https://t.me/gainpayofficialchanel",
    telegramGroupUrl: "https://t.me/gainpayy",
    telegramSupportId: "@gainpay1"
  });
  const [activeTab, setActiveTab] = useState<"users" | "buys" | "sells" | "txs" | "settings" | "orders">("users");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newOrderAmount, setNewOrderAmount] = useState("");
  const [newOrderUpiId, setNewOrderUpiId] = useState("");
  const [newOrderRewardPercent, setNewOrderRewardPercent] = useState("4.5");
  const [searchTerm, setSearchTerm] = useState("");
  const [customMinutes, setCustomMinutes] = useState("60");
  const [editBalance, setEditBalance] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/admin");
  };

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    const unsubTxs = onSnapshot(collection(db, "transactions"), (snap) => {
      setTransactions(snap.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "transactions");
    });
    const unsubBuys = onSnapshot(collection(db, "buyRequests"), (snap) => {
      setBuyRequests(snap.docs.map(d => ({ ...d.data(), id: d.id } as BuyRequest)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "buyRequests");
    });
    const unsubSells = onSnapshot(collection(db, "sellRequests"), (snap) => {
      setSellRequests(snap.docs.map(d => ({ ...d.data(), id: d.id } as SellRequest)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "sellRequests");
    });
    const unsubSettings = onSnapshot(doc(db, "config", "settings"), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as AppSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "config/settings");
    });
    const unsubBuyOptions = onSnapshot(collection(db, "buyOptions"), (snap) => {
      setBuyOptions(snap.docs.map(d => ({ ...d.data(), id: d.id } as BuyOption)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "buyOptions");
    });

    return () => {
      unsubUsers();
      unsubTxs();
      unsubBuys();
      unsubSells();
      unsubSettings();
      unsubBuyOptions();
    };
  }, []);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "config", "settings"), settings, { merge: true });
      alert("Settings updated successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Check console for details.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleBlockUser = async (uid: string, isBlocked: boolean) => {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, "users", uid), { isBlocked: !isBlocked });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleUpdateUserRestriction = async (uid: string, data: Partial<UserProfile>) => {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, "users", uid), data);
      setSelectedUser(null);
      alert("User restrictions updated!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleApproveBuy = async (request: BuyRequest) => {
    const user = users.find(u => u.uid === request.userId);
    if (!user) {
      alert("User not found!");
      return;
    }

    setProcessingId(request.id);
    try {
      const rewardPercent = request.rewardPercent || settings.globalRewardPercent || 4.5;
      const rewardAmount = request.amount * (rewardPercent / 100);
      const totalAmount = request.amount + rewardAmount;

      // 1. Update user balance
      await updateDoc(doc(db, "users", request.userId), { 
        balance: increment(totalAmount) 
      });
      
      // 2. Update request status
      await updateDoc(doc(db, "buyRequests", request.id), { status: "approved" });
      
      // 2.1 Update buy option status if exists
      if (request.optionId) {
        await updateDoc(doc(db, "buyOptions", request.optionId), { status: "sold" });
      }
      
      // 3. Add transaction records
      await addDoc(collection(db, "transactions"), {
        userId: request.userId,
        type: "buy",
        amount: request.amount,
        status: "completed",
        createdAt: Date.now(),
        method: "UPI",
        description: "Buy principal"
      });

      await addDoc(collection(db, "transactions"), {
        userId: request.userId,
        type: "reward",
        amount: rewardAmount,
        status: "completed",
        createdAt: Date.now(),
        method: "UPI",
        description: `Buy reward (${rewardPercent}%)`
      });

      // 4. Referral Commission Logic (Level 1)
      if (user.referredBy) {
        try {
          const l1Query = query(collection(db, "users"), where("referralCode", "==", user.referredBy));
          const l1Snap = await getDocs(l1Query);
          
          if (!l1Snap.empty) {
            const l1UserDoc = l1Snap.docs[0];
            const l1User = l1UserDoc.data() as UserProfile;
            const l1Commission = request.amount * 0.003; // 0.3%

            if (l1Commission > 0) {
              await updateDoc(doc(db, "users", l1UserDoc.id), {
                balance: increment(l1Commission)
              });

              await addDoc(collection(db, "transactions"), {
                userId: l1UserDoc.id,
                type: "commission",
                amount: l1Commission,
                status: "completed",
                createdAt: Date.now(),
                description: `Level 1 referral commission from ${user.phone}`
              });

              // 5. Referral Commission Logic (Level 2)
              if (l1User.referredBy) {
                const l2Query = query(collection(db, "users"), where("referralCode", "==", l1User.referredBy));
                const l2Snap = await getDocs(l2Query);

                if (!l2Snap.empty) {
                  const l2UserDoc = l2Snap.docs[0];
                  const l2Commission = request.amount * 0.001; // 0.1%

                  if (l2Commission > 0) {
                    await updateDoc(doc(db, "users", l2UserDoc.id), {
                      balance: increment(l2Commission)
                    });

                    await addDoc(collection(db, "transactions"), {
                      userId: l2UserDoc.id,
                      type: "commission",
                      amount: l2Commission,
                      status: "completed",
                      createdAt: Date.now(),
                      description: `Level 2 referral commission from ${user.phone}`
                    });
                  }
                }
              }
            }
          }
        } catch (refError) {
          console.error("Referral commission error:", refError);
          // Don't block the main approval if referral fails
        }
      }
      alert("Buy request approved!");
    } catch (error) {
      console.error("Error approving buy request:", error);
      alert("Failed to approve request: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveSell = async (request: SellRequest) => {
    const user = users.find(u => u.uid === request.userId);
    if (!user) {
      alert("User not found!");
      return;
    }
    
    if (user.balance < request.amount) {
      alert("Insufficient user balance!");
      return;
    }

    setProcessingId(request.id);
    try {
      await updateDoc(doc(db, "users", request.userId), { balance: increment(-request.amount) });
      await updateDoc(doc(db, "sellRequests", request.id), { status: "approved" });
      
      await addDoc(collection(db, "transactions"), {
        userId: request.userId,
        type: "sell",
        amount: request.amount,
        status: "completed",
        createdAt: Date.now(),
        method: "UPI"
      });
      alert("Sell request approved!");
    } catch (error) {
      console.error("Error approving sell request:", error);
      alert("Failed to approve sell request: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectBuy = async (request: BuyRequest) => {
    setProcessingId(request.id);
    try {
      await updateDoc(doc(db, "buyRequests", request.id), { status: "rejected" });
      
      // Revert buy option status if exists
      if (request.optionId) {
        await updateDoc(doc(db, "buyOptions", request.optionId), { status: "available" });
      }
      
      alert("Buy request rejected.");
    } catch (error) {
      console.error("Error rejecting buy request:", error);
      alert("Failed to reject request: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSell = async (request: SellRequest, minutes?: number) => {
    setProcessingId(request.id);
    try {
      await updateDoc(doc(db, "sellRequests", request.id), { status: "rejected" });
      
      if (minutes) {
        await updateDoc(doc(db, "users", request.userId), {
          sellRestrictedUntil: Date.now() + minutes * 60 * 1000
        });
      }
      
      const timeStr = minutes ? (minutes >= 60 ? `${(minutes/60).toFixed(1)}h` : `${minutes}m`) : "";
      alert(`Sell request rejected${timeStr ? ` and user restricted for ${timeStr}` : ""}.`);
    } catch (error) {
      console.error("Error rejecting sell request:", error);
      alert("Failed to reject sell request: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddBuyOption = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(newOrderAmount);
    const reward = Number(newOrderRewardPercent);
    if (isNaN(amt) || amt <= 0) return;

    try {
      await addDoc(collection(db, "buyOptions"), {
        amount: amt,
        upiId: newOrderUpiId || settings.adminUpiId,
        rewardPercent: isNaN(reward) ? 4.5 : reward,
        status: "available",
        createdAt: Date.now(),
        orderNo: Math.floor(Math.random() * 10000000000000000).toString()
      });
      setNewOrderAmount("");
      setNewOrderUpiId("");
      setNewOrderRewardPercent("4.5");
      alert("Order added successfully!");
    } catch (error) {
      console.error("Error adding order:", error);
      alert("Failed to add order.");
    }
  };

  const handleDeleteBuyOption = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      // For simplicity, we'll just mark it as sold or similar, but let's just delete it if available
      // Actually, deleting is fine for available ones
      await updateDoc(doc(db, "buyOptions", id), { status: "sold" }); // Or deleteDoc
      alert("Order removed.");
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Gainpay Dashboard</h1>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <input 
              type="text"
              placeholder="Search user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg flex-1 sm:flex-none">
              <TrendingUp size={16} className="text-blue-600" />
              <span className="text-xs font-black text-blue-600 whitespace-nowrap">Total Users: {users.length}</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Sidebar / Mobile Nav */}
        <div className="md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-2 md:p-4 flex md:flex-col overflow-x-auto md:overflow-x-visible no-scrollbar space-x-2 md:space-x-0 md:space-y-2 shrink-0">
          <button 
            onClick={() => setActiveTab("users")}
            className={cn("flex items-center space-x-3 p-3 rounded-xl text-sm font-black transition-all whitespace-nowrap md:w-full", activeTab === "users" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-50")}
          >
            <Users size={18} />
            <span>Users</span>
          </button>
          <button 
            onClick={() => setActiveTab("buys")}
            className={cn("flex items-center space-x-3 p-3 rounded-xl text-sm font-black transition-all whitespace-nowrap md:w-full", activeTab === "buys" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-50")}
          >
            <ShoppingCart size={18} />
            <span>Buys</span>
          </button>
          <button 
            onClick={() => setActiveTab("sells")}
            className={cn("flex items-center space-x-3 p-3 rounded-xl text-sm font-black transition-all whitespace-nowrap md:w-full", activeTab === "sells" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-50")}
          >
            <CreditCard size={18} />
            <span>Sells</span>
          </button>
          <button 
            onClick={() => setActiveTab("txs")}
            className={cn("flex items-center space-x-3 p-3 rounded-xl text-sm font-black transition-all whitespace-nowrap md:w-full", activeTab === "txs" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-50")}
          >
            <History size={18} />
            <span>History</span>
          </button>
          <button 
            onClick={() => setActiveTab("orders")}
            className={cn("flex items-center space-x-3 p-3 rounded-xl text-sm font-black transition-all whitespace-nowrap md:w-full", activeTab === "orders" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-50")}
          >
            <Package size={18} />
            <span>Orders</span>
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={cn("flex items-center space-x-3 p-3 rounded-xl text-sm font-black transition-all whitespace-nowrap md:w-full", activeTab === "settings" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-50")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === "orders" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Buy Orders Management</h2>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Add New Order</h3>
                <form onSubmit={handleAddBuyOption} className="flex flex-col md:flex-row gap-4">
                  <input 
                    type="number"
                    placeholder="Enter Order Amount (₹)"
                    value={newOrderAmount}
                    onChange={(e) => setNewOrderAmount(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                  <input 
                    type="text"
                    placeholder="UPI ID (Optional)"
                    value={newOrderUpiId}
                    onChange={(e) => setNewOrderUpiId(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="Reward %"
                    value={newOrderRewardPercent}
                    onChange={(e) => setNewOrderRewardPercent(e.target.value)}
                    className="w-32 bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                  <button 
                    type="submit"
                    className="bg-blue-600 text-white px-8 rounded-xl text-xs font-black shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest"
                  >
                    <Plus size={16} />
                    <span>Add Order</span>
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Available Orders</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {buyOptions.filter(o => o.status === "available").map(o => (
                    <div key={o.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order No: {o.orderNo}</p>
                        <p className="text-lg font-black text-gray-900">₹{o.amount} <span className="text-xs text-green-600 ml-2">+{o.rewardPercent || 4.5}%</span></p>
                        {o.upiId && <p className="text-[10px] font-bold text-blue-500">{o.upiId}</p>}
                      </div>
                      <button 
                        onClick={() => handleDeleteBuyOption(o.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {buyOptions.filter(o => o.status === "available").length === 0 && (
                    <div className="col-span-full py-10 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No available orders. Add some above.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">User Management</h2>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Phone</th>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Address</th>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Balance</th>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-sm font-black text-gray-800">{u.phone}</td>
                        <td className="p-4 text-xs font-mono text-gray-400">{u.walletAddress}</td>
                        <td className="p-4 text-sm font-black text-blue-600">₹{u.balance.toFixed(2)}</td>
                        <td className="p-4">
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", u.isBlocked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600")}>
                            {u.isBlocked ? "Blocked" : "Active"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button 
                            onClick={() => {
                              setSelectedUser(u);
                              setEditBalance(u.balance.toString());
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Manage Restrictions"
                          >
                            <Settings size={18} />
                          </button>
                          <button 
                            onClick={() => handleBlockUser(u.uid, u.isBlocked)}
                            className={cn("p-2 rounded-lg transition-all", u.isBlocked ? "text-green-600 hover:bg-green-50" : "text-red-600 hover:bg-red-50")}
                          >
                            {u.isBlocked ? <Unlock size={18} /> : <Ban size={18} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="max-w-2xl space-y-8">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">App Settings</h2>
              
              <form onSubmit={handleUpdateSettings} className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Admin UPI ID</label>
                      <input 
                        type="text"
                        value={settings.adminUpiId}
                        onChange={(e) => setSettings({ ...settings, adminUpiId: e.target.value })}
                        placeholder="e.g. 1234567890@upi"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Global Reward %</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={settings.globalRewardPercent}
                        onChange={(e) => setSettings({ ...settings, globalRewardPercent: Number(e.target.value) })}
                        placeholder="e.g. 4.5"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Banner Image URL</label>
                    <input 
                      type="text"
                      value={settings.bannerUrl || ""}
                      onChange={(e) => setSettings({ ...settings, bannerUrl: e.target.value })}
                      placeholder="https://example.com/banner.jpg"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Telegram Channel</label>
                      <input 
                        type="text"
                        value={settings.telegramChannelUrl}
                        onChange={(e) => setSettings({ ...settings, telegramChannelUrl: e.target.value })}
                        placeholder="https://t.me/..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Telegram Group</label>
                      <input 
                        type="text"
                        value={settings.telegramGroupUrl}
                        onChange={(e) => setSettings({ ...settings, telegramGroupUrl: e.target.value })}
                        placeholder="https://t.me/..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Telegram Support ID</label>
                    <input 
                      type="text"
                      value={settings.telegramSupportId}
                      onChange={(e) => setSettings({ ...settings, telegramSupportId: e.target.value })}
                      placeholder="@username"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">ImgBB API Key</label>
                    <input 
                      type="text"
                      value={settings.imgbbApiKey || ""}
                      onChange={(e) => setSettings({ ...settings, imgbbApiKey: e.target.value })}
                      placeholder="Your ImgBB API Key"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={savingSettings}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl text-xs font-black shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 uppercase tracking-widest"
                >
                  <Save size={16} />
                  <span>{savingSettings ? "Saving..." : "Save Settings"}</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === "buys" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Buy Requests (UPI)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buyRequests.filter(r => r.status === "pending").map(r => (
                  <div key={r.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User: {users.find(u => u.uid === r.userId)?.phone}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User UPI: {r.userUpiId || "N/A"}</p>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">To this UPI: {r.adminUpiId || "N/A"}</p>
                        {r.utr && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UTR: {r.utr}</p>}
                      </div>
                      <span className="text-lg font-black text-blue-600">₹{r.amount}</span>
                    </div>

                    {r.screenshot && (
                      <div className="relative group">
                        <img 
                          src={r.screenshot} 
                          alt="Payment Screenshot" 
                          className="w-full h-40 object-cover rounded-xl border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(r.screenshot, "_blank")}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-xl pointer-events-none">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full">Click to view full</span>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleApproveBuy(r)}
                        disabled={processingId === r.id}
                        className="flex-1 bg-green-600 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-green-100 flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <Check size={14} />
                        <span>{processingId === r.id ? "..." : "Approve"}</span>
                      </button>
                      <button 
                        onClick={() => handleRejectBuy(r)}
                        disabled={processingId === r.id}
                        className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl text-xs font-black border border-red-100 flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <X size={14} />
                        <span>{processingId === r.id ? "..." : "Reject"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "sells" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Sell Requests (UPI)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sellRequests.filter(r => r.status === "pending").map(r => (
                  <div key={r.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UPI ID: {r.upiId}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User: {users.find(u => u.uid === r.userId)?.phone}</p>
                      </div>
                      <span className="text-lg font-black text-red-600">₹{r.amount}</span>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button 
                        onClick={() => handleApproveSell(r)}
                        disabled={processingId === r.id}
                        className="w-full bg-green-600 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-green-100 flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <Check size={14} />
                        <span>{processingId === r.id ? "..." : "Approve"}</span>
                      </button>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="number"
                            placeholder="Mins"
                            value={customMinutes}
                            onChange={(e) => setCustomMinutes(e.target.value)}
                            className="w-20 bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-[10px] font-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button 
                            onClick={() => handleRejectSell(r, Number(customMinutes))}
                            disabled={processingId === r.id}
                            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-[10px] font-black shadow-sm flex items-center justify-center space-x-1 disabled:opacity-50"
                          >
                            <X size={12} />
                            <span>Reject + {customMinutes}m</span>
                          </button>
                        </div>
                        <button 
                          onClick={() => handleRejectSell(r)}
                          disabled={processingId === r.id}
                          className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg text-[10px] font-black border border-gray-200 flex items-center justify-center space-x-1 disabled:opacity-50"
                        >
                          <X size={12} />
                          <span>Reject Only</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "txs" && (
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">Transaction History</h2>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Type</th>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.sort((a, b) => b.createdAt - a.createdAt).map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-xs font-bold text-gray-500">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-sm font-black text-gray-800">
                          {users.find(u => u.uid === tx.userId)?.phone || tx.userId}
                        </td>
                        <td className="p-4">
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", 
                            tx.type === "buy" ? "bg-blue-100 text-blue-600" : 
                            tx.type === "sell" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600")}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-black">₹{tx.amount.toFixed(2)}</td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Similar sections for sells and txs */}
        </div>
      </div>

      {/* User Restriction Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight italic">Manage User: {selectedUser.phone}</h3>
                <button onClick={() => setSelectedUser(null)} className="p-2 text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Balance Editing */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Edit Balance (IToken)</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="number"
                      placeholder="Enter balance"
                      value={editBalance}
                      onChange={(e) => setEditBalance(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button
                      onClick={() => handleUpdateUserRestriction(selectedUser.uid, { 
                        balance: Number(editBalance) 
                      })}
                      className="bg-green-600 text-white px-6 py-4 rounded-xl text-xs font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all uppercase tracking-widest"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {/* UPI Status */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">UPI Selling Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["active", "waiting", "stopped"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleUpdateUserRestriction(selectedUser.uid, { sellStatus: status })}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          selectedUser.sellStatus === status 
                            ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" 
                            : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cooldown */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Sell Cooldown (Minutes)</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="number"
                      placeholder="Enter minutes"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button
                      onClick={() => handleUpdateUserRestriction(selectedUser.uid, { 
                        sellRestrictedUntil: Date.now() + Number(customMinutes) * 60 * 1000 
                      })}
                      className="bg-blue-600 text-white px-6 py-4 rounded-xl text-xs font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateUserRestriction(selectedUser.uid, { 
                        sellRestrictedUntil: Date.now() + 30 * 60 * 1000 
                      })}
                      className="py-3 bg-gray-50 text-gray-600 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                    >
                      30 Mins
                    </button>
                    <button
                      onClick={() => handleUpdateUserRestriction(selectedUser.uid, { 
                        sellRestrictedUntil: Date.now() + 50 * 60 * 1000 
                      })}
                      className="py-3 bg-gray-50 text-gray-600 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                    >
                      50 Mins
                    </button>
                    <button
                      onClick={() => handleUpdateUserRestriction(selectedUser.uid, { sellRestrictedUntil: 0 })}
                      className="col-span-2 py-3 bg-green-50 text-green-600 border border-green-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-all"
                    >
                      Clear Cooldown
                    </button>
                  </div>
                  {selectedUser.sellRestrictedUntil && selectedUser.sellRestrictedUntil > Date.now() && (
                    <p className="text-[10px] font-bold text-red-500 text-center uppercase tracking-tight">
                      Currently restricted until: {new Date(selectedUser.sellRestrictedUntil).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
