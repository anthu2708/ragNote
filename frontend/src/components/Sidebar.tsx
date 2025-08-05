import React, {useState} from "react";
import {MdDashboard} from "react-icons/md";
import {FiSettings, FiLogOut} from "react-icons/fi";
import {fetchCurrentUser, logout} from "../utils/auth";
import {useNavigate} from 'react-router-dom';
import {useEffect} from "react";

const Sidebar: React.FC = () => {

    const navigate = useNavigate();
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
            navigate('/login');
        } catch (err) {
            console.error('Logout failed');
        }
    };
    return (
        <div
            className="hidden sm:flex fixed top-0 left-0 h-screen w-60 flex-col bg-sidebar/10 backdrop-blur-sm shadow-inner shadow-black/20 rounded-tr-3xl rounded-br-3xl p-4 text-white z-50 fixed">
            {/* Top section: Logo & title */}
            <div className="flex flex-col items-center mb-8">
                <div className="w-14 h-14 rounded-full bg-white/80 mb-2"></div>
                <h1 className="text-lg font-bold">AI Chatbot</h1>
                <p className="text-xs text-white/60">Doc Manager</p>
            </div>

            {/* Menu items */}
            <div className="flex flex-col flex-1 gap-2">
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-button backdrop-blur-50 rounded-full text-white/80 hover:bg-white/10 transition">
                    {<MdDashboard/>}
                    <span>Dashboard</span>
                </button>
                {/*<button className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-full transition">*/}
                {/*  {<FiSettings />}*/}
                {/*  <span>Settings</span>*/}
                {/*</button>*/}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-full transition">
                    {<FiLogOut/>}
                    <span>Logout</span>
                </button>

            </div>

            {/* Bottom avatar */}
            <div className="flex items-center justify-center pb-4">
                <button
                    className="flex items-center gap-2 bg-gradient-card backdrop-blur-50 pl-2 pr-4 py-2 rounded-full text-white/80">
                    {user?.avatar && !imgError ? (
                        <img
                            src={user.avatar}
                            onError={() => setImgError(true)}
                            className="w-7 h-7 rounded-full object-cover"
                            alt="avatar"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-ava"/>
                    )}
                    <span className="font-bold">{user?.name || "User"}</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
