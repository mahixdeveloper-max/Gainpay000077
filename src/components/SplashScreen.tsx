import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet } from "lucide-react";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [loading, setLoading] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLoading((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => {
      clearInterval(timer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden"
      style={{
        background: "radial-gradient(circle at center, #0a192f 0%, #000000 100%)",
      }}
    >
      {/* Particle Background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              opacity: 0 
            }}
            animate={{ 
              y: [null, Math.random() * -100 - 50],
              opacity: [0, 0.3, 0],
              scale: [0, 1, 0]
            }}
            transition={{ 
              duration: Math.random() * 3 + 2, 
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 2
            }}
            className="absolute w-1 h-1 bg-blue-400 rounded-full blur-[1px]"
          />
        ))}
      </div>

      {/* Glow Effect behind Logo */}
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
        className="absolute w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"
      />

      {/* Logo Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 1 }}
        transition={{ 
          duration: 1.5, 
          ease: "easeOut" 
        }}
        className="relative flex flex-col items-center space-y-4"
      >
        <div className="relative">
          {/* 3D-ish Logo Icon */}
          <motion.div
            animate={{ 
              rotateY: [0, 360],
              filter: ["drop-shadow(0 0 10px #3b82f6)", "drop-shadow(0 0 25px #3b82f6)", "drop-shadow(0 0 10px #3b82f6)"]
            }}
            transition={{ 
              rotateY: { duration: 4, repeat: Infinity, ease: "linear" },
              filter: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-700 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.5)] border border-blue-400/30"
            style={{ transformStyle: "preserve-3d" }}
          >
            <Wallet size={48} className="text-white drop-shadow-lg" />
          </motion.div>
        </div>

        <div className="text-center space-y-1">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl font-black text-white tracking-tighter italic"
            style={{
              textShadow: "0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(59,130,246,0.2)"
            }}
          >
            GAIN PAY
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]"
          >
            Smart Crypto & Payments
          </motion.p>
        </div>
      </motion.div>

      {/* Loading Bar at Bottom */}
      <div className="absolute bottom-20 w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${loading}%` }}
          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_#3b82f6]"
        />
      </div>

      {/* Glassmorphism accent */}
      <div className="absolute top-0 left-0 w-full h-full bg-white/[0.02] pointer-events-none" />
    </motion.div>
  );
}
