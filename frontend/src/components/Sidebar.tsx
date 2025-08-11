import React, {useEffect, useState} from "react";
import {MdAdd, MdDashboard} from "react-icons/md";
import {FiLogOut} from "react-icons/fi";
import {fetchCurrentUser, logout} from "../utils/auth";
import {useLocation, useNavigate} from "react-router-dom";

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<{ name: string; avatar?: string } | null>(null);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        fetchCurrentUser()
            .then((res) => setUser({name: res.name || "User", avatar: res.avatar}))
            .catch(() => setUser(null));
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch {
            console.error("Logout failed");
        }
    };

    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <aside
            className="
        hidden sm:flex fixed inset-y-0 left-0 z-40
        w-60 flex-col
        bg-black/40 backdrop-blur ring-1 ring-white/10
        rounded-r-3xl
        px-3 py-4
        text-white
      "
        >
            {/* Brand */}
            <div className="flex flex-col items-center gap-1 mb-6">
                <div className="w-14 h-14 rounded-full bg-white/80"/>
                <h1 className="text-base font-semibold tracking-tight">AI Chatbot</h1>
                <p className="text-xs text-white/60">Doc Manager</p>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-2 flex-1">
                <button
                    onClick={() => navigate("/dashboard")}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl ring-1 transition
            ${isActive("/dashboard")
                        ? "bg-white/15 ring-white/15 text-white"
                        : "bg-white/5 ring-white/10 text-white/85 hover:bg-white/10"
                    }`}
                >
                    <MdDashboard/>
                    <span>Dashboard</span>
                </button>

                <button
                    onClick={() => navigate("/add")}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl ring-1 transition
      ${isActive("/add")
                        ? "bg-white/15 ring-white/15 text-white"
                        : "bg-white/5 ring-white/10 text-white/85 hover:bg-white/10"
                    }`}
                >
                    <MdAdd/>
                    <span>New Project</span>
                </button>

                {/* Add more items here if needed */}

                <div className="mt-auto"/>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition"
                >
                    <FiLogOut/>
                    <span>Logout</span>
                </button>
            </nav>

            {/* User chip */}
            <div className="pt-4">
                <div className="flex items-center gap-2 bg-white/5 ring-1 ring-white/10 px-2 py-2 rounded-full">
                    {user?.avatar && !imgError ? (
                        <img
                            src={user.avatar}
                            onError={() => setImgError(true)}
                            className="w-7 h-7 rounded-full object-cover"
                            alt="avatar"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-white/30"/>
                    )}
                    <span className="text-sm font-semibold">{user?.name || "User"}</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
