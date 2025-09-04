// src/pages/ChatScreen.tsx
import React, {useEffect, useMemo, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {getMessagesByChatId, sendMessageToAI, Message as ApiMessage, getChatTitle} from "../utils/api";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
};

const Header: React.FC<{ chatId?: string }> = ({chatId}) => {
    const [title, setTitle] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!chatId) return;
        getChatTitle(chatId)
            .then((t) => setTitle(t))
            .catch((err) => {
                console.error("Failed to fetch chat title:", err);
                setError(true);
                setTitle("Chat with AI");
            });
    }, [chatId]);

    if (title === null && !error) {
        return (
            <div className="sticky top-0 z-10 px-4 md:px-6 py-4 backdrop-blur-sm bg-black/30 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div className="h-6 w-40 bg-white/20 rounded animate-pulse"/>
                </div>
            </div>
        );
    }

    return (
        <div className="sticky top-0 z-10 px-4 md:px-6 py-4 backdrop-blur-sm bg-black/30 border-b border-white/10">
            <div className="flex items-center justify-between">
                <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                    {title}
                </h1>
            </div>
        </div>
    );
};

const Avatar: React.FC<{ role: Message["role"] }> = ({role}) => (
    <div
        className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
            role === "assistant" ? "bg-violet-500/80" : "bg-white/20"
        }`}
    >
        {role === "assistant" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3 6 6 .9-4.5 4.4L17 20l-5-2.6L7 20l1.5-6.7L4 8.9 10 8l2-6z" stroke="currentColor"
                      className="text-white"/>
            </svg>
        ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z"
                      stroke="currentColor" className="text-white"/>
            </svg>
        )}
    </div>
);

const Bubble: React.FC<{ msg: ApiMessage }> = ({msg}) => {
    const time = useMemo(() => {
        if (!msg.created_at) return "";
        try {
            const d = new Date(msg.created_at);
            return d.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
        } catch {
            return "";
        }
    }, [msg.created_at]);

    const isAI = msg.role === "assistant";

    return (
        <div className={`flex w-full gap-3 ${isAI ? "justify-start" : "justify-end"}`}>
            {isAI && <Avatar role={msg.role}/>}
            <div
                className={`max-w-[70ch] rounded-2xl px-4 py-3 shadow-md leading-7 text-[15px] md:text-base ${
                    isAI ? "bg-[#2A2A3B] text-neutral-100 ring-1 ring-white/10" : "bg-white/10 text-white ring-1 ring-white/10"
                }`}
            >
                <div className="prose prose-invert prose-sm md:prose-base max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                {time && <div className="mt-1.5 text-xs text-white/50">{time}</div>}
            </div>
            {!isAI && <Avatar role={msg.role}/>}
        </div>
    );
};

const TypingBubble: React.FC = () => (
    <div className="flex gap-3 items-end">
        <Avatar role="assistant"/>
        <div className="bg-[#2A2A3B] text-neutral-100 ring-1 ring-white/10 rounded-2xl px-4 py-3 shadow-md">
            <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-white/60 animate-bounce"/>
                <span className="inline-block h-2 w-2 rounded-full bg-white/60 animate-bounce [animation-delay:120ms]"/>
                <span className="inline-block h-2 w-2 rounded-full bg-white/60 animate-bounce [animation-delay:240ms]"/>
            </div>
        </div>
    </div>
);

const ChatScreen: React.FC = () => {
    const {chatId} = useParams<{ chatId: string }>();

    const [messages, setMessages] = useState<ApiMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const listRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);


    useEffect(() => {
        if (!chatId) return;
        setIsFetching(true);
        getMessagesByChatId(chatId)
            .then(setMessages)
            .catch((err) => console.error("Failed to fetch messages:", err))
            .finally(() => setIsFetching(false));
        ;
    }, [chatId]);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = "0px";
            el.style.height = Math.min(el.scrollHeight, 240) + "px";
        }
    }, [input]);

    const send = async () => {
        const text = input.trim();
        if (!text || !chatId || isLoading) return;

        const userMsg: ApiMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            created_at: new Date().toISOString(),
        };


        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const aiMsg = await sendMessageToAI(chatId, text);
            console.log(aiMsg);
            console.log(aiMsg.id);
            console.log(aiMsg.created_at);
            console.log(aiMsg.content);
            const resMsg: ApiMessage = {
                id: aiMsg.id,
                role: "assistant",
                content: aiMsg.content,
                created_at: aiMsg.created_at,
            };
            setMessages((prev) => [...prev, resMsg]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div className="flex h-screen bg-cover bg-center bg-[url('/src/assets/bg.png')]">
            <Sidebar/>
            <main className="flex-1 sm:pl-60 h-full">
                <div className="h-full flex items-center justify-center px-8 md:px-8 py-8">
                    <div
                        className="w-full h-full mx-auto rounded-3xl overflow-hidden bg-black/40 backdrop-blur ring-1 ring-white/10 shadow-xl flex flex-col">
                        <Header chatId={chatId}/>
                        <div ref={listRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4
                        scrollbar-thin scrollbar-thumb-neutral-700/60
                        scrollbar-track-transparent hover:scrollbar-thumb-neutral-700
                        dark:scrollbar-thumb-neutral-600">
                            {isFetching ? (
                                <div className="flex justify-center items-center h-full text-white/60">
                                    Loading chat...
                                </div>
                            ) : (
                                <>
                                    {messages.map((m) => (
                                        <Bubble key={m.id} msg={m}/>
                                    ))}
                                    {isLoading && <TypingBubble/>}
                                </>
                            )}

                        </div>
                        <div className="border-t border-white/10 p-3 md:p-4">
                            <div className="flex items-end gap-2">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Type your message… (Shift+Enter for new line)"
                    className="flex-1 resize-none rounded-2xl bg-white/10 text-white
                    placeholder-white/60 ring-1 ring-white/10 px-4 py-3
                    focus:outline-none focus:ring-2 focus:ring-violet-400
                    scrollbar-thin scrollbar-track-transparent
                    scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40"
                />
                                <button
                                    onClick={send}
                                    className="h-12 px-4 rounded-2xl bg-violet-500 hover:bg-violet-600 text-white font-medium ring-1 ring-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!input.trim() || isLoading}
                                    aria-label="Send message"
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                        <path d="M2 21l20-9L2 3l4 7 9 2-9 2-4 7z" fill="currentColor"/>
                                    </svg>
                                </button>
                            </div>
                            <div className="mt-2 text-xs text-white/50 px-1">
                                Press <kbd className="px-1 py-0.5 bg-white/10 rounded">Enter</kbd> to send ·{" "}
                                <kbd className="px-1 py-0.5 bg-white/10 rounded">Shift</kbd> +{" "}
                                <kbd className="px-1 py-0.5 bg-white/10 rounded">Enter</kbd> for new line
                            </div>
                        </div>
                    </div>
                </div>
                <Footer/>
            </main>
        </div>
    );
};

export default ChatScreen;
