import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatBubble from "../components/ChatBubble";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const mockChats: Record<string, Message[]> = {
  "1": [
    { id: "1", role: "user", content: "What is a cover letter?" },
    {
      id: "2",
      role: "assistant",
      content:
        "A cover letter is a document sent with your resume to introduce yourself.",
    },
  ],
  "2": [
    { id: "1", role: "user", content: "What is Docker?" },
    {
      id: "2",
      role: "assistant",
      content:
        "Docker is a tool designed to make it easier to create, deploy, and run applications by using containers.",
    },
  ],
};

const ChatScreen: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (chatId && mockChats[chatId]) {
      setMessages(mockChats[chatId]);
    } else {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Welcome! How can I help you today?",
        },
      ]);
    }
  }, [chatId]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };
    const newAssistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "I received your message: " + input,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [...prev, newAssistantMsg]);
    }, 600);
  };

  return (
    <div className="flex flex-col bg-cover bg-center bg-[url('/src/assets/bg.png')] min-h-screen">
      <Sidebar />
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
          <div className="flex flex-col h-[670px] bg-white/5 rounded-3xl backdrop-blur-lg shadow-inner overflow-hidden ">
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
    </div>
  );
};

export default ChatScreen;
