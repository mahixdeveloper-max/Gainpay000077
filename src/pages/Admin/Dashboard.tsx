import { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { collection, query, getDocs, updateDoc, doc, onSnapshot, addDoc, increment, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { UserProfile, Transaction, BuyRequest, SellRequest } from "../../types";
import { Users, CreditCard, ShoppingCart, History, Check, X, Ban, Unlock, TrendingUp, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buyRequests, setBuyRequests] = useState<BuyRequest[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "buys" | "sells" | "txs">("users");
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

    return () => {
      unsubUsers();
      unsubTxs();
      unsubBuys();
      unsubSells();
    };
  }, []);

  const handleBlockUser = async (uid: string, isBlocked: boolean) => {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, "users", uid), { isBlocked: !isBlocked });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleApproveBuy = async (request: BuyRequest) => {
    const user = users.find(u => u.uid === request.userId);
    if (!user) return;

    try {
      // 1. Update user balance
      await updateDoc(doc(db, "users", request.userId), { 
        balance: increment(request.amount) 
      });
      
      // 2. Update request status
      await updateDoc(doc(db, "buyRequests", request.id), { status: "approved" });
      
      // 3. Add transaction record for the user
      await addDoc(collection(db, "transactions"), {
        userId: request.userId,
        type: "buy",
        amount: request.amount,
        status: "completed",
        createdAt: Date.now(),
        method: "UPI"
      });

      // 4. Referral Commission Logic (Level 1)
      if (user.referredBy) {
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
      }
    } catch (error) {
      console.error("Error approving buy request:", error);
    }
  };

  const handleApproveSell = async (request: SellRequest) => {
    const user = users.find(u => u.uid === request.userId);
    if (user && user.balance >= request.amount) {
      await updateDoc(doc(db, "users", request.userId), { balance: increment(-request.amount) });
      await updateDoc(doc(db, "sellRequests", request.id), { status: "approved" });
      // Add transaction
      await addDoc(collection(db, "transactions"), {
        userId: request.userId,
        type: "sell",
        amount: request.amount,
        status: "completed",
        createdAt: Date.now(),
        method: "UPI"
      });
    }
  };

  const handleRejectBuy = async (id: string) => {
    await updateDoc(doc(db, "buyRequests", id), { status: "rejected" });
  };

  const handleRejectSell = async (id: string) => {
    await updateDoc(doc(db, "sellRequests", id), { status: "rejected" });
  };

  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(u => 
    u.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Gainpay Admin</h1>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
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
                        <td className="p-4 text-right">
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

          {activeTab === "buys" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Buy Requests (UPI)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buyRequests.filter(r => r.status === "pending").map(r => (
                  <div key={r.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UTR: {r.utr}</span>
                      <span className="text-lg font-black text-blue-600">₹{r.amount}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleApproveBuy(r)}
                        className="flex-1 bg-green-600 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-green-100 flex items-center justify-center space-x-2"
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                      <button 
                        onClick={() => handleRejectBuy(r.id)}
                        className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl text-xs font-black border border-red-100 flex items-center justify-center space-x-2"
                      >
                        <X size={14} />
                        <span>Reject</span>
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
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleApproveSell(r)}
                        className="flex-1 bg-green-600 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-green-100 flex items-center justify-center space-x-2"
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                      <button 
                        onClick={() => handleRejectSell(r.id)}
                        className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl text-xs font-black border border-red-100 flex items-center justify-center space-x-2"
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
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
    </div>
  );
}
