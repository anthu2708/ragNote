import React from "react";
import Sidebar from "../components/Sidebar";
import ProjectCard from "../components/ProjectCard";
import {BUTTON_EFFECT, CARD_EFFECT, STROKE_EFFECT} from "../constants/tailwind";
import {useNavigate} from 'react-router-dom';
import Footer from "../components/Footer";
import {useEffect, useState} from "react";
import {getAllChats, Project} from "../utils/api";


function formatRelativeTime(dateString: string): string {
    const now = new Date();
    const created = new Date(dateString);

    const deltaMs = now.getTime() - created.getTime();
    const deltaSec = Math.floor(deltaMs / 1000);
    const deltaMin = Math.floor(deltaSec / 60);
    const deltaHr = Math.floor(deltaMin / 60);
    const deltaDay = Math.floor(deltaHr / 24);
    const deltaMonth = Math.floor(deltaDay / 30);
    const deltaYear = Math.floor(deltaDay / 365);

    if (deltaYear > 0) return `${deltaYear} year${deltaYear > 1 ? "s" : ""} ago`;
    if (deltaMonth > 0) return `${deltaMonth} month${deltaMonth > 1 ? "s" : ""} ago`;
    if (deltaDay > 0) return `${deltaDay} day${deltaDay > 1 ? "s" : ""} ago`;
    if (deltaHr > 0) return `${deltaHr} hour${deltaHr > 1 ? "s" : ""} ago`;
    if (deltaMin > 0) return `${deltaMin} minute${deltaMin > 1 ? "s" : ""} ago`;
    return "just now";
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    // const mockProjects = [
    //     {id: "1", title: "Test 1", created: "2025-07-28T10:30:00Z"},
    //     {id: "2", title: "Test 2", created: "2025-07-28T09:15:00Z"},
    //     {id: "3", title: "Test 3", created: "2025-07-28T18:00:00Z"},
    //     {id: "4", title: "Test 4", created: "2025-07-28T11:00:00Z"},
    // ];

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAllChats()
            .then(setProjects)
            .catch((err) => console.error("Failed to load chats", err))
            .finally(() => setLoading(false));
    }, []);


    const sortedProjects = [...projects].sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );

    return (
        <div className="flex flex-col bg-cover bg-center bg-[url('/src/assets/bg.png')] min-h-screen">
            <Sidebar/>
            <main className="flex flex-col flex-1 sm:pl-60">
                <div className="flex-1 px-8 py-14 flex flex-col">
                    {/* Header section */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-5xl  font-bold text-white">Your Projects</h1>
                        </div>
                        <div className={`${STROKE_EFFECT} `}>
                            <button
                                onClick={() => navigate('/add')}
                                className={`font-medium px-5 py-3 bg-white/10 hover:bg-white/20 drop-shadow-lg backdrop-blur-xl rounded-full text-white text-sm flex items-center justify-center transition duration-300 ease-in-out`}>
                                <span className="hidden mini:inline drop-shadow-lg">+ Add</span>
                                <span className="hidden md:inline drop-shadow-lg">&nbsp;Project</span>
                            </button>
                        </div>

                    </div>

                    {/* Cards section */}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full pt-2">
                        {loading ? (
                            <div
                                className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-10 flex flex-col items-center justify-center text-white w-full min-h-[180px]">
                                <div
                                    className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"/>
                                <div className="text-sm opacity-80 animate-pulse">Loading your chats...</div>
                            </div>
                        ) : (
                            sortedProjects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    id={project.id}
                                    title={project.title}
                                    created={formatRelativeTime(project.created)}
                                />
                            ))
                        )}
                    </div>

                </div>
            </main>
            <Footer/>
        </div>
    );
};

export default Dashboard;
