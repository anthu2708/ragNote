// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import ProjectCard from "../components/ProjectCard";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import { getAllChats, Project } from "../utils/api";
import { formatRelativeTime } from "../utils/utils";
import { FiSearch } from "react-icons/fi";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // load projects
  useEffect(() => {
    let mounted = true;
    getAllChats()
      .then((res) => mounted && setProjects(res))
      .catch((err) => console.error("Failed to load chats", err))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // focus vào input khi mở search
  useEffect(() => {
    if (showSearch) {
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [showSearch]);

  // filter + sort
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const sorted = [...projects].sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );
    if (!q) return sorted;
    return sorted.filter((p) => p.title.toLowerCase().includes(q));
  }, [projects, query]);

  const onKeyDownSearch: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Escape") {
      setShowSearch(false);
      setQuery("");
    }
  };

  return (
    <div className="flex min-h-screen bg-cover bg-center bg-[url('/src/assets/bg.png')]">
      <Sidebar />

      <main className="flex-1 sm:pl-60">
        <div className="px-4 md:px-8 py-8 md:py-12 pb-28 sm:pb-10">
          {/* Surface */}
          <div className="max-w-full mx-auto rounded-3xl overflow-hidden bg-black/40 backdrop-blur ring-1 ring-white/10 shadow-xl">
            {/* Header */}
            <div className="px-4 md:px-6 py-4 border-b border-white/10 flex items-center">
              <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
                Your Projects
              </h1>

              {/* Right controls */}
              <div className="ml-auto flex items-center">
                {/* icon search (chỉ hiện khi chưa mở input) */}
                {!showSearch && (
                  <button
                    aria-label="Search projects"
                    onClick={() => setShowSearch(true)}
                    className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 ring-1 ring-white/10 hover:bg-white/15 text-white"
                  >
                    <FiSearch />
                  </button>
                )}

                {/* thanh search: khi đóng => width = 0 để icon sát mép phải */}
                <div
                  className={`relative overflow-hidden transition-[width,opacity] duration-200 ease-out ml-2
                  ${showSearch ? "w-56 md:w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"}`}
                >
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDownSearch}
                    placeholder="Search projects…"
                    className="w-full rounded-xl bg-white/10 text-white placeholder-white/60 ring-1 ring-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  {/* nút Esc nhỏ bên phải */}
                  {showSearch && (
                    <button
                      aria-label="Close search"
                      onClick={() => {
                        setShowSearch(false);
                        setQuery("");
                      }}
                      className="absolute right-1 top-1.5 px-2 py-1 text-xs rounded-lg bg-white/10 text-white/80 hover:bg-white/15"
                    >
                      Esc
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6">
              {loading ? (
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-10 flex flex-col items-center justify-center text-white w-full min-h-[180px]">
                  <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                  <div className="text-sm opacity-80 animate-pulse">
                    Loading your chats…
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-white/80 py-16">
                  <h2 className="text-lg font-medium">No projects found</h2>
                  <p className="mt-1 text-sm">
                    Try a different search or create a new project.
                  </p>
                  <button
                    onClick={() => navigate("/add")}
                    className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/10"
                  >
                    Create Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {filtered.map((p) => (
                    <ProjectCard
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      created={formatRelativeTime(p.created)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
};

export default Dashboard;
