import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home, ShoppingCart, CreditCard, Users, User } from "lucide-react";
import { cn } from "../lib/utils";
import { UserProfile } from "../types";

interface LayoutProps {
  profile: UserProfile | null;
}

export default function Layout({ profile }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Buy", path: "/buy", icon: ShoppingCart },
    { name: "UPI", path: "/upi", icon: CreditCard },
    { name: "Team", path: "/team", icon: Users },
    { name: "Mine", path: "/mine", icon: User },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto relative overflow-hidden shadow-xl">
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 flex justify-around items-center py-2 px-1 z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center space-y-1 w-full py-1 transition-colors duration-200",
                isActive ? "text-blue-600" : "text-gray-400"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
