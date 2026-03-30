import React, { useState } from "react";
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldCheck, Phone } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

export default function AdminLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, `${phone}@gainpay.com`, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      const isAdminByPhone = phone === "6491643491";
      if (userDoc.exists() && (userDoc.data().role === "admin" || isAdminByPhone)) {
        navigate("/admin/dashboard");
      } else {
        setError("Access denied. You are not an administrator.");
        await auth.signOut();
      }
    } catch (err: any) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <ShieldCheck size={40} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Portal</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gainpay Management System</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone size={18} />
              </div>
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-gray-800 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-gray-800 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-[10px] font-black text-red-600 text-center uppercase tracking-tight">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl text-sm font-black shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-[0.2em]"
          >
            {loading ? "Authenticating..." : "Enter Dashboard"}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => navigate("/")}
            className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
          >
            Back to User App
          </button>
        </div>
      </div>
    </div>
  );
}
