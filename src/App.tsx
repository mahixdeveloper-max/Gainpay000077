import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "./lib/firebase";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { UserProfile, AppSettings } from "./types";
import ErrorBoundary from "./components/ErrorBoundary";

// Pages
import Home from "./pages/Home";
import Buy from "./pages/Buy";
import UPI from "./pages/UPI";
import Team from "./pages/Team";
import Mine from "./pages/Mine";
import History from "./pages/History";
import EventCenter from "./pages/EventCenter";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminLogin from "./pages/Admin/Login";
import Layout from "./components/Layout";
import WhatsAppVerification from "./components/WhatsAppVerification";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      // Unsubscribe previous listeners if they exist
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }
      if (unsubscribeSettings) {
        unsubscribeSettings();
        unsubscribeSettings = undefined;
      }

      setUser(u);
      if (u) {
        // Fetch settings - only when authenticated
        unsubscribeSettings = onSnapshot(doc(db, "config", "settings"), (snap) => {
          if (snap.exists()) {
            setSettings(snap.data() as AppSettings);
          }
        }, (error) => {
          console.warn("Settings listener restricted:", error.message);
        });

        const path = `users/${u.uid}`;
        unsubscribeProfile = onSnapshot(
          doc(db, "users", u.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile({ ...docSnap.data(), uid: docSnap.id } as UserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            // Only handle error if we are still logged in as this user
            if (auth.currentUser?.uid === u.uid) {
              handleFirestoreError(error, OperationType.GET, path);
            }
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Logic for redirection
  // 1. If not logged in -> can only access /login, /register, /admin
  // 2. If logged in but no profile -> must go to /register to complete setup
  // 3. If logged in and has profile -> can access everything

  return (
    <ErrorBoundary>
      <Router>
        {user && profile && !profile.isVerified && <WhatsAppVerification profile={profile} />}
        <Routes>
          <Route path="/login" element={!user ? <Login /> : (profile ? <Navigate to="/" /> : <Navigate to="/register" />)} />
          <Route path="/register" element={!profile ? <Register /> : <Navigate to="/" />} />
          
          <Route element={user ? (profile ? <Layout profile={profile} /> : <Navigate to="/register" />) : <Navigate to="/login" />}>
            <Route path="/" element={<Home profile={profile} settings={settings} />} />
            <Route path="/buy" element={<Buy profile={profile} settings={settings} />} />
            <Route path="/upi" element={<UPI profile={profile} settings={settings} />} />
            <Route path="/team" element={<Team profile={profile} />} />
            <Route path="/mine" element={<Mine profile={profile} settings={settings} />} />
            <Route path="/history" element={<History profile={profile} />} />
            <Route path="/event-center" element={<EventCenter profile={profile} settings={settings} />} />
          </Route>

          <Route path="/admin" element={<AdminLogin />} />
          <Route 
            path="/admin/dashboard" 
            element={profile?.role === "admin" ? <AdminDashboard /> : <Navigate to="/admin" />} 
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
