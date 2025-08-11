import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MdDashboard, MdAdd } from "react-icons/md";
import { FiLogOut } from "react-icons/fi";
import { logout } from "../utils/auth";

/**
 * Unified glass Footer that MATCHES ChatScreen & Sidebar.
 * - Mobile-first: visible on < sm, hidden on desktop (Sidebar covers desktop nav)
 * - Fixed, rounded, safe-area padding, high contrast
 * - 3 primary actions: Dashboard, New Project, Logout
 * - Active states synced with route
 */
const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const go = (path: string) => () => navigate(path);
  const onLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <footer
      className="sm:hidden fixed inset-x-3 bottom-3 z-40 text-white rounded-2xl bg-black/50 backdrop-blur ring-1 ring-white/10 shadow-2xl px-3 py-2.5"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      aria-label="App footer"
    >
      <div className="grid grid-cols-3 gap-2">
        {/* Dashboard */}
        <button
          onClick={go("/dashboard")}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 ring-1 transition ${
            isActive("/dashboard")
              ? "bg-white/20 ring-white/20"
              : "bg-white/10 ring-white/10 hover:bg-white/15"
          }`}
          aria-current={isActive("/dashboard") ? "page" : undefined}
        >
          <MdDashboard />
          <span className="text-sm">Dashboard</span>
        </button>

        {/* New Project */}
        <button
          onClick={go("/add")}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 ring-1 transition ${
            isActive("/add")
              ? "bg-white/20 ring-white/20"
              : "bg-white/10 ring-white/10 hover:bg-white/15"
          }`}
          aria-current={isActive("/add") ? "page" : undefined}
        >
          <MdAdd />
          <span className="text-sm">New</span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 bg-white/10 ring-1 ring-white/10 hover:bg-white/15 transition"
        >
          <FiLogOut />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </footer>
  );
};

export default Footer;
