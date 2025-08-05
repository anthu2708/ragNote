import React, { useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import Footer from "../components/Footer";

const AddProjectScreen: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

return (
  <div className="flex min-h-screen bg-cover bg-center bg-[url('/src/assets/bg.png')]">
    <Sidebar />
    <div className="flex flex-col flex-1 min-h-screen">
      <div className="flex-1 flex flex-col sm:pl-60 px-8 py-14">

          <div className=" sm:pl-10 ">
            <h1 className="text-5xl font-bold text-white mb-2">Create New Project</h1>
            <p className="text-white/70 text-lg mb-8">This is where our journey start...</p>

            <div className="flex justify-center w-full">
              <div className="w-full min-w-3xl bg-white/10 backdrop-blur-2xl rounded-3xl p-4 shadow-xl">
                <div className="p-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent text-white text-xl font-semibold focus:outline-none"
                    placeholder="Project Name"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Description"
                    className="w-full bg-transparent text-white/50 text-md font-semibold focus:outline-none resize-none"
                  />
                </div>

                <div
                  className="w-full mb-4 h-40 rounded-xl border border-white/20 bg-white/10 text-white/50 flex items-center justify-center cursor-pointer hover:bg-white/20 transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {fileName ? (
                    <span className="text-white/80">{fileName}</span>
                  ) : (
                    <p className="text-gray-400 flex items-center gap-2">
                      <ArrowUpTrayIcon className="h-5 w-5 text-primary" />
                      Upload your first docs
                    </p>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    className="px-8 py-3 rounded-full bg-white/20 text-white font-semibold backdrop-blur-xl hover:bg-white/30 transition shadow-lg"
                    onClick={() => {
                      // handle create logic
                    }}
                  >
                    Create
                  </button>
                  <button
                    className="px-8 py-3 rounded-full bg-white/10 text-white/70 font-semibold backdrop-blur-xl hover:bg-white/20 transition shadow"
                    onClick={() => navigate("/dashboard")}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default AddProjectScreen;
