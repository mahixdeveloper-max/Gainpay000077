import { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, ShieldCheck, AlertCircle, X } from "lucide-react";

interface Props {
  profile: UserProfile;
}

export default function WhatsAppVerification({ profile }: Props) {
  const [showPopup, setShowPopup] = useState(!profile.isVerified);
  const [phone, setPhone] = useState(profile.phone || "");
  const [step, setStep] = useState<"number" | "otp">("number");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const requestOtp = async () => {
    if (!phone) return setError("Please enter WhatsApp number");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, userId: profile.uid }),
      });
      const data = await res.json();
      if (res.ok) {
        setCountdown(30);
        setStep("otp");
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return setError("Please enter 6-digit OTP");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, userId: profile.uid }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setShowPopup(false), 2000);
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!showPopup || profile.isVerified) {
    return (
      <div className="fixed top-4 left-4 z-[9999]">
        <div className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center space-x-2">
          <ShieldCheck size={12} />
          <span>Verified</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Bubble */}
      <div className="fixed top-4 left-4 z-[9999]">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center space-x-2"
        >
          <MessageCircle size={12} />
          <span>Enter OTP after you receive</span>
        </motion.div>
      </div>

      {/* Verification Popup */}
      <AnimatePresence>
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="bg-blue-600 p-6 text-center text-white relative">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tighter">WhatsApp Verification</h3>
              <p className="text-[10px] opacity-80 mt-1 uppercase font-bold tracking-widest">Verify your number to continue</p>
            </div>

            <div className="p-6 space-y-4">
              {success ? (
                <div className="bg-green-50 text-green-600 p-4 rounded-2xl flex flex-col items-center text-center space-y-2">
                  <ShieldCheck size={32} />
                  <p className="text-xs font-black uppercase tracking-widest">Verification Successful!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {step === "number" ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">WhatsApp Number</p>
                        <input 
                          type="tel" 
                          placeholder="e.g. +919876543210"
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-6 text-center text-sm font-black text-gray-800 focus:outline-none focus:border-blue-600 transition-all"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={requestOtp}
                        disabled={loading || !phone}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <Send size={12} />
                        <span>{loading ? "Sending..." : "Get OTP"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Sent to {phone}</p>
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-6 text-center text-lg font-black tracking-[0.5em] focus:outline-none focus:border-blue-600 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-normal"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={requestOtp}
                          disabled={loading || countdown > 0}
                          className="bg-gray-100 text-gray-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                          {countdown > 0 ? `Resend in ${countdown}s` : "Resend"}
                        </button>
                        <button 
                          onClick={verifyOtp}
                          disabled={loading || otp.length !== 6}
                          className="bg-blue-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                          <Send size={12} />
                          <span>Verify</span>
                        </button>
                      </div>
                      <button 
                        onClick={() => setStep("number")}
                        className="w-full text-[9px] text-blue-600 font-black uppercase tracking-widest hover:underline"
                      >
                        Change Number
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center space-x-2 text-red-500 bg-red-50 p-3 rounded-xl">
                      <AlertCircle size={16} />
                      <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{error}</p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[9px] text-gray-400 text-center leading-relaxed font-medium">
                OTP will be sent to your WhatsApp number. Please check your messages.
              </p>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
}
