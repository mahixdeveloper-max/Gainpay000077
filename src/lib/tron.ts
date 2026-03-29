import { TronWeb } from "tronweb";
import CryptoJS from "crypto-js";

const SECRET_KEY = "gainpay-secret-key"; // In production, this should be in an env var

export const generateWallet = async () => {
  const tronWeb = new TronWeb({
    fullHost: "https://api.trongrid.io",
  });
  const account = await tronWeb.createAccount();
  return {
    address: account.address.base58,
    privateKey: account.privateKey,
  };
};

export const encryptPrivateKey = (privateKey: string) => {
  return CryptoJS.AES.encrypt(privateKey, SECRET_KEY).toString();
};

export const decryptPrivateKey = (encryptedPrivateKey: string) => {
  const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const checkTransaction = async (address: string) => {
  // Use TronGrid API to check for incoming USDT (TRC20)
  try {
    const response = await fetch(
      `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=10&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
    );
    const data = await response.json();
    return data.data; // List of TRC20 transactions
  } catch (error) {
    console.error("Error checking transactions:", error);
    return [];
  }
};
