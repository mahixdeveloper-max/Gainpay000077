export interface UserProfile {
  uid: string;
  phone: string;
  walletAddress: string;
  encryptedPrivateKey: string;
  balance: number;
  isBlocked: boolean;
  role: "admin" | "user";
  createdAt: number;
  upiId?: string;
  upiIds?: string[];
  referralCode: string;
  referredBy?: string;
  sellRestrictedUntil?: number;
  sellStatus?: "active" | "waiting" | "stopped";
  completedTasks?: string[];
  lastCheckIn?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "deposit" | "buy" | "sell" | "transfer" | "commission" | "reward";
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed";
  txHash?: string;
  createdAt: number;
  utr?: string; // For UPI
  method?: "UPI" | "USDT";
  description?: string;
}

export interface SellRequest {
  id: string;
  userId: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  upiId: string;
  createdAt: number;
}

export interface BuyRequest {
  id: string;
  userId: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  utr?: string;
  screenshot?: string; // Base64 or URL
  userUpiId?: string;
  adminUpiId?: string; // The UPI ID the user was asked to pay to
  optionId?: string; // Link to BuyOption
  rewardPercent?: number;
  createdAt: number;
}

export interface AppSettings {
  adminUpiId: string;
  imgbbApiKey?: string;
  globalRewardPercent: number;
  bannerUrl?: string;
  telegramChannelUrl: string;
  telegramGroupUrl: string;
  telegramSupportId: string;
}

export interface BuyOption {
  id: string;
  amount: number;
  status: "available" | "pending" | "sold";
  createdAt: number;
  orderNo: string;
  upiId?: string;
  rewardPercent?: number;
}
