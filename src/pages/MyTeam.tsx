import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { UserProfile } from "../types";
import { cn } from "../lib/utils";

interface TeamMember extends UserProfile {
  teamSize: number;
  performance: number;
}

interface MyTeamProps {
  profile: UserProfile | null;
}

export default function MyTeam({ profile }: MyTeamProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.referralCode) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        // 1. Fetch Level 1 referrals
        const q1 = query(
          collection(db, "users"), 
          where("referredBy", "==", profile.referralCode),
          orderBy("createdAt", "desc")
        );
        const snap1 = await getDocs(q1);
        const l1Users = snap1.docs.map(d => ({ id: d.id, ...d.data() } as any));

        const membersWithStats = await Promise.all(l1Users.map(async (user: any) => {
          // 2. Fetch their performance (Total approved buy requests)
          const qBuy = query(
            collection(db, "buyRequests"),
            where("userId", "==", user.id),
            where("status", "==", "approved")
          );
          const buySnap = await getDocs(qBuy);
          const performance = buySnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);

          // 3. Fetch their team size (L1 + L2 under them)
          // Level 1 under them
          const qSub1 = query(collection(db, "users"), where("referredBy", "==", user.referralCode));
          const sub1Snap = await getDocs(qSub1);
          const sub1Count = sub1Snap.size;
          const sub1Codes = sub1Snap.docs.map(d => d.data().referralCode).filter(Boolean);

          let sub2Count = 0;
          if (sub1Codes.length > 0) {
            // Level 2 under them
            for (let i = 0; i < sub1Codes.length; i += 10) {
              const chunk = sub1Codes.slice(i, i + 10);
              const qSub2 = query(collection(db, "users"), where("referredBy", "in", chunk));
              const sub2Snap = await getDocs(qSub2);
              sub2Count += sub2Snap.size;
            }
          }

          return {
            ...user,
            teamSize: sub1Count + sub2Count,
            performance
          };
        }));

        setMembers(membersWithStats);
      } catch (error) {
        console.error("Error fetching team members:", error);
        handleFirestoreError(error, OperationType.LIST, "users");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [profile]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toISOString().replace('T', ' ').split('.')[0];
  };

  const formatExpireDate = (timestamp: number) => {
    if (!timestamp) return "N/A";
    // Example: 2 hours after creation or just a fixed offset for UI matching
    const date = new Date(timestamp + 2 * 60 * 60 * 1000);
    return date.toISOString().replace('T', ' ').split('.')[0];
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight">My Team</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Team Members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4 px-8 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
              <User size={32} />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No team members found. Start inviting!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map((member) => (
              <div key={member.uid} className="p-6 flex items-start space-x-4 hover:bg-gray-50 transition-colors">
                {/* Coin Icon */}
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-100 shrink-0 mt-1">
                  <span className="text-white font-black text-lg">₹</span>
                </div>

                {/* Info */}
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">{member.phone}</h3>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-gray-400">Team size: {member.teamSize}</p>
                    <p className="text-[11px] font-bold text-gray-400">Team performance: ₹ {member.performance}</p>
                    <p className="text-[11px] font-bold text-gray-400">Uid: {member.uid.slice(0, 10)}</p>
                    <p className="text-[11px] font-bold text-gray-400">Last Login: {formatDate(member.createdAt)}</p>
                    <p className="text-[11px] font-bold text-gray-400">Dividend: 0</p>
                    <p className="text-[11px] font-bold text-red-500">Last Expire: {formatExpireDate(member.createdAt)}</p>
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center space-x-1 text-gray-400 group cursor-pointer pt-1">
                  <span className="text-[11px] font-bold group-hover:text-blue-600 transition-colors">Operating</span>
                  <ChevronRight size={16} className="group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
