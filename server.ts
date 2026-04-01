import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "whatsapp-web.js";
const { Client, NoAuth, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

// WhatsApp Client
const whatsapp = new Client({
  authStrategy: new LocalAuth(),
  webVersionCache: {
    type: "remote",
    remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
  },
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--single-process", "--no-zygote", "--disable-dev-shm-usage", "--no-first-run", "--disable-extensions", "--proxy-server='direct://'", "--proxy-bypass-list=*", "--disable-web-security", "--disable-features=IsolateOrigins,site-per-process", "--remote-debugging-port=9222"],
    headless: true,
  },
});

let isWhatsAppReady = false;
let lastQrCode = "";

whatsapp.on("qr", (qr) => {
  console.log("WhatsApp QR Received, scan to connect:");
  qrcode.generate(qr, { small: true });
  lastQrCode = qr;
});

whatsapp.on("ready", () => {
  console.log("WhatsApp Client is ready!");
  isWhatsAppReady = true;
});

whatsapp.on("disconnected", (reason) => {
  console.log("WhatsApp Client was disconnected:", reason);
  isWhatsAppReady = false;
  whatsapp.initialize(); // Try to reconnect
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // OTP Request Endpoint
  app.post("/api/otp/request", async (req, res) => {
    const { phone, userId } = req.body;
    if (!phone || !userId) return res.status(400).json({ error: "Phone and userId required" });

    if (!isWhatsAppReady) return res.status(503).json({ error: "WhatsApp service not ready" });

    try {
      // Rate limiting: 1 OTP per 30 seconds
      const otpRef = db.collection("otps").doc(phone);
      const otpDoc = await otpRef.get();
      if (otpDoc.exists) {
        const data = otpDoc.data();
        if (Date.now() - data?.timestamp < 30000) {
          return res.status(429).json({ error: "Please wait 30 seconds before requesting another OTP" });
        }
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const timestamp = Date.now();
      const expiry = timestamp + 120000; // 2 minutes

      await otpRef.set({ otp, timestamp, expiry, userId });

      // Send via WhatsApp
      const formattedPhone = phone.replace(/\D/g, "");
      const chatId = `${formattedPhone}@c.us`;
      
      const sendMessage = async (retry = 1) => {
        try {
          await whatsapp.sendMessage(chatId, `Your Gainpay OTP is: ${otp}\nExpires in 2 minutes.`);
          console.log(`OTP sent to ${phone}: ${otp}`);
        } catch (err) {
          if (retry > 0) {
            console.log(`Retrying OTP send to ${phone}...`);
            await sendMessage(retry - 1);
          } else {
            throw err;
          }
        }
      };

      await sendMessage();
      res.json({ success: true, message: "OTP sent via WhatsApp" });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // OTP Verification Endpoint
  app.post("/api/otp/verify", async (req, res) => {
    const { phone, otp, userId } = req.body;
    if (!phone || !otp || !userId) return res.status(400).json({ error: "Phone, OTP and userId required" });

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

      const userData = userDoc.data();
      if (userData?.blockedUntil && userData.blockedUntil > Date.now()) {
        return res.status(403).json({ error: "Account temporarily blocked due to too many failed attempts. Try again later." });
      }

      const otpRef = db.collection("otps").doc(phone);
      const otpDoc = await otpRef.get();

      if (!otpDoc.exists) return res.status(400).json({ error: "No OTP requested for this number" });

      const otpData = otpDoc.data();
      if (Date.now() > otpData?.expiry) {
        return res.status(400).json({ error: "OTP has expired" });
      }

      if (otpData?.otp === otp) {
        // Success
        await userRef.update({ 
          isVerified: true, 
          verificationAttempts: 0,
          blockedUntil: null 
        });
        await otpRef.delete();
        res.json({ success: true });
      } else {
        // Wrong OTP
        const attempts = (userData?.verificationAttempts || 0) + 1;
        if (attempts >= 3) {
          const blockedUntil = Date.now() + 300000; // 5 minutes block
          await userRef.update({ verificationAttempts: 0, blockedUntil });
          res.status(403).json({ error: "Too many failed attempts. Account blocked for 5 minutes." });
        } else {
          await userRef.update({ verificationAttempts: attempts });
          res.status(400).json({ error: `Invalid OTP. ${3 - attempts} attempts remaining.` });
        }
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // WhatsApp Status and QR Endpoint
  app.get("/api/admin/whatsapp/status", async (req, res) => {
    res.json({ 
      isReady: isWhatsAppReady, 
      qrCode: isWhatsAppReady ? null : lastQrCode 
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", whatsapp: isWhatsAppReady });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Initialize WhatsApp after server is up
    whatsapp.initialize().catch(err => {
      console.error("Failed to initialize WhatsApp:", err);
    });
  });
}

startServer();
