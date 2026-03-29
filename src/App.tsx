import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "./lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { UserProfile } from "./types";
import ErrorBoundary from "./components/ErrorBoundary";

// Pages
import Home from "./pages/Home";
import Buy from "./pages/Buy";
import UPI from "./pages/UPI";
import Team from "./pages/Team";
import Mine from "./pages/Mine";
import History from "./pages/History";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminLogin from "./pages/Admin/Login";
import Layout from "./components/Layout";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const path = `users/${u.uid}`;
        unsubscribeProfile = onSnapshot(
          doc(db, "users", u.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile({ ...docSnap.data(), uid: docSnap.id } as UserProfile);
            }
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, path);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      unsubscribeAuth();
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

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          
          <Route element={user ? <Layout profile={profile} /> : <Navigate to="/login" />}>
            <Route path="/" element={<Home profile={profile} />} />
            <Route path="/buy" element={<Buy profile={profile} />} />
            <Route path="/upi" element={<UPI profile={profile} />} />
            <Route path="/team" element={<Team profile={profile} />} />
            <Route path="/mine" element={<Mine profile={profile} />} />
            <Route path="/history" element={<History profile={profile} />} />
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
