import { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs, updateDoc, increment, addDoc } from "firebase/firestore";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Phone, Lock, User, CheckCircle2 } from "lucide-react";
import { generateWallet, encryptPrivateKey } from "../lib/tron";
import { cn } from "../lib/utils";

export default function Register() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
    }
  }, [searchParams]);

  const handleRegister = async (e: any) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match");
    if (!agree) return alert("Please agree to the User Privacy Agreement");
    
    setLoading(true);
    setError("");
    try {
      // Firebase Auth uses email, so we'll use phone + "@gainpay.com" as a placeholder
      const userCredential = await createUserWithEmailAndPassword(auth, `${phone}@gainpay.com`, password);
      const user = userCredential.user;
      
      const wallet = await generateWallet();
      const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey);

      const path = `users/${user.uid}`;
      try {
        // 1. Create the new user with 50 rupees initial balance
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          phone,
          walletAddress: wallet.address,
          encryptedPrivateKey,
          balance: 50,
          isBlocked: false,
          role: "user",
          createdAt: Date.now(),
          referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          referredBy: referralCode || null,
        });

        // 2. Add registration reward transaction
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          type: "reward",
          amount: 50,
          status: "completed",
          createdAt: Date.now(),
          description: "Registration Bonus",
        });

        // 3. Handle referral reward (Invite Reward)
        if (referralCode) {
          const referrerQuery = query(collection(db, "users"), where("referralCode", "==", referralCode));
          const referrerSnap = await getDocs(referrerQuery);
          
          if (!referrerSnap.empty) {
            const referrerDoc = referrerSnap.docs[0];
            const referrerId = referrerDoc.id;
            
            // Credit referrer 20 rupees (Invite Reward)
            await updateDoc(doc(db, "users", referrerId), {
              balance: increment(20)
            });

            // Add reward transaction for referrer
            await addDoc(collection(db, "transactions"), {
              userId: referrerId,
              type: "reward",
              amount: 20,
              status: "completed",
              createdAt: Date.now(),
              description: `Invite Reward (Referral: ${phone})`,
            });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }

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
      <form onSubmit={handleRegister} className="space-y-6">
        <div className="space-y-4">
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

          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 group-focus-within:text-blue-600 transition-colors">
              <Lock size={20} strokeWidth={2.5} />
            </div>
            <input
              type="password"
              placeholder="Confirm password"
              className="w-full bg-blue-50/50 border border-blue-100 rounded-full py-5 pl-16 pr-8 text-sm font-black text-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all placeholder:text-gray-300"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 group-focus-within:text-blue-600 transition-colors">
              <User size={20} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Referral code (optional)"
              className="w-full bg-blue-50/50 border border-blue-100 rounded-full py-5 pl-16 pr-8 text-sm font-black text-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all placeholder:text-gray-300"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-center space-x-3 px-2">
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

        {error && <p className="text-red-500 text-[10px] font-black text-center uppercase tracking-tight">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-5 rounded-2xl text-sm font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-[0.2em]"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <div className="text-center pt-8">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Already have an account? <Link to="/login" className="text-blue-600 underline">Login Now</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
