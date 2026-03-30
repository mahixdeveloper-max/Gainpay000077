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
  referralCode: string;
  referredBy?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "deposit" | "buy" | "sell" | "transfer";
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed";
  txHash?: string;
  createdAt: number;
  utr?: string; // For UPI
  method?: "UPI" | "USDT";
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
