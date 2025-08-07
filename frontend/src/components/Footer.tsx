import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdDashboard } from "react-icons/md";
import { FiLogOut } from "react-icons/fi";
import { FaFacebookF, FaTwitter, FaLinkedinIn } from "react-icons/fa";
import { logout, fetchCurrentUser } from "../utils/auth";

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    fetchCurrentUser()
      .then((res) => setName(res.name || ""))
      .catch(() => setName(""));
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div className="sm:hidden w-full bg-black/80 text-white text-sm px-4 py-4 border-t border-white/10 z-50">
      {/* Dynamic Name */}
      <div className="text-center mb-3 font-semibold">
        {name ? `Hi, ${name}` : "Hi"}
      </div>

      {/* Navigation */}
      <div className="flex justify-center gap-8 mb-4 text-sm">
        <div
          className="flex items-center gap-1 text-white/80 hover:underline hover:text-white cursor-pointer transition"
          onClick={() => navigate("/dashboard")}
        >
          <MdDashboard size={16} />
          <span>Dashboard</span>
        </div>

        <div
          className="flex items-center gap-1 text-white/80 hover:underline hover:text-white cursor-pointer transition"
          onClick={handleLogout}
        >
          <FiLogOut size={16} />
          <span>Logout</span>
        </div>
      </div>

      {/* Contact */}
      <div className="text-center mb-2">Get in touch:</div>
      <div className="flex justify-center gap-4 mb-3">
        <FaFacebookF className="hover:text-gray-300 cursor-pointer" />
        <FaTwitter className="hover:text-gray-300 cursor-pointer" />
        <FaLinkedinIn className="hover:text-gray-300 cursor-pointer" />
      </div>
    </div>
  );
};

export default Footer;
