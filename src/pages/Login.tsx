import { useState } from "react";
import { auth } from "../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { Phone, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [savePassword, setSavePassword] = useState(false);
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: any) => {
    e.preventDefault();
    if (!agree) return alert("Please agree to the User Privacy Agreement");
    setLoading(true);
    setError("");
    try {
      // Firebase Auth uses email, so we'll use phone + "@gainpay.com" as a placeholder
      await signInWithEmailAndPassword(auth, `${phone}@gainpay.com`, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto p-8 space-y-12">
      {/* Logo */}
      <div className="flex flex-col items-center justify-center pt-12">
        <div className="relative">
          <h1 className="text-7xl font-black text-yellow-400 italic tracking-tighter uppercase leading-none drop-shadow-2xl">
            Gainpay
          </h1>
          <div className="absolute -inset-1 text-7xl font-black text-red-600 italic tracking-tighter uppercase leading-none -z-10 blur-[0.5px]">
            Gainpay
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-8">
        <div className="space-y-6">
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 group-focus-within:text-blue-600 transition-colors">
              <Phone size={20} strokeWidth={2.5} />
            </div>
            <input
              type="tel"
              placeholder="Enter phone number"
              className="w-full bg-blue-50/50 border border-blue-100 rounded-full py-5 pl-16 pr-8 text-sm font-black text-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all placeholder:text-gray-300"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 group-focus-within:text-blue-600 transition-colors">
              <Lock size={20} strokeWidth={2.5} />
            </div>
            <input
              type="password"
              placeholder="Enter password"
              className="w-full bg-blue-50/50 border border-blue-100 rounded-full py-5 pl-16 pr-8 text-sm font-black text-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all placeholder:text-gray-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex justify-between items-center px-2">
          <button
            type="button"
            onClick={() => setSavePassword(!savePassword)}
            className="flex items-center space-x-3 group"
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              savePassword ? "bg-blue-600 border-blue-600" : "border-gray-200 group-hover:border-blue-400"
            )}>
              {savePassword && <CheckCircle2 size={14} className="text-white" />}
            </div>
            <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Save Password</span>
          </button>
          <Link to="#" className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline">
            Forgot password
          </Link>
        </div>

        {error && <p className="text-red-500 text-[10px] font-black text-center uppercase tracking-tight">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-5 rounded-2xl text-sm font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-[0.2em]"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="flex items-center justify-center space-x-3">
          <button
            type="button"
            onClick={() => setAgree(!agree)}
            className="flex items-center space-x-3 group"
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              agree ? "bg-blue-600 border-blue-600" : "border-gray-200 group-hover:border-blue-400"
            )}>
              {agree && <CheckCircle2 size={14} className="text-white" />}
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">
              Agree <Link to="#" className="text-blue-600 underline">"User Privacy Agreement"</Link>
            </p>
          </button>
        </div>

        <div className="text-center pt-8">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Don't have an account? <Link to="/register" className="text-blue-600 underline">Register Now</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
