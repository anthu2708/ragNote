import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatBubble from "../components/ChatBubble";
import Footer from "../components/Footer";
import {getMessagesByChatId, sendMessageToAI, Message as ApiMessage} from "../utils/api";


type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};


const ChatScreen: React.FC = () => {
    const {chatId} = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");

    useEffect(() => {
        const fetchMessages = async () => {
            if (!chatId) return;
            try {
                const data = await getMessagesByChatId(chatId);
                setMessages(data);
            } catch (error) {
                console.error("Failed to fetch messages:", error);
            }
        };

        fetchMessages();
    }, [chatId]);


    const handleSend = async () => {
        if (!input.trim() || !chatId) return;

        const newUserMsg: ApiMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: input,
        };

        setMessages((prev) => [...prev, newUserMsg]);
        setInput("");

        try {
            const aiResponse = await sendMessageToAI(chatId, input);
            setMessages((prev) => [...prev, aiResponse]);
        } catch (error) {
            console.error("AI response failed:", error);
        }
    };

    return (
        <div className="flex flex-col bg-cover bg-center bg-[url('/src/assets/bg.png')] min-h-screen">
            <Sidebar/>
            <main className="sm:pl-60">
                <div className="flex flex-col flex-1 px-8 py-14">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 pb-4">
                        <h1 className="text-4xl font-bold text-white">Chat with AI</h1>
                        <button
                            className="px-6 py-2 rounded-full bg-white/10 text-white  hover:bg-white/20 transition"
                            onClick={() => navigate("/dashboard")}
                        >
                            Home
                        </button>
                    </div>

                    {/* Chat box */}
                    <div
                        className="flex flex-col h-[670px] bg-white/5 rounded-3xl backdrop-blur-lg shadow-inner overflow-hidden ">
                        <div className="flex-1 overflow-y-auto space-y-4 p-4 mt-2">
                            {messages.map((msg) => (
                                <ChatBubble
                                    key={msg.id}
                                    message={msg.content}
                                    type={msg.role}
                                />
                            ))}
                        </div>

                        <div className="p-4 flex gap-3 border-t border-white/10">
                            <input
                                className="flex-1 px-5 py-2 rounded-full bg-white/20 text-white placeholder-white/60 focus:outline-none backdrop-blur-sm"
                                placeholder="Type your message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            />
                            <button
                                className="px-6 py-2 bg-white/10 rounded-full text-white font-medium backdrop-blur-xl hover:bg-white/20 transition"
                                onClick={handleSend}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </main>
            <Footer/>
        </div>
    );
};

export default ChatScreen;
