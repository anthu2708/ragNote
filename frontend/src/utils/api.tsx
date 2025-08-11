import axios from './axios'

export interface Project {
    id: string
    title: string
    created: string
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
}

export interface UploadedFile {
    id: string;
    filename?: string;
    original_name?: string;
    url?: string;
    mime_type?: string;
    size?: number;
    chat_id: string;
    created_at?: string;
}

export interface ChatResponse {
    id: string;
    title: string;
    updated_at: string;
}


export const getAllChats = async (): Promise<Project[]> => {
    const res = await axios.get<Project[]>('/chat/', {withCredentials: true})
    return res.data
}

export const createChat = async (title: string, files: File[]): Promise<ChatResponse> => {
    if (!title?.trim() || !files?.length) {
        throw new Error("Title and at least one file are required.");
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    for (const f of files) formData.append("files", f);

    const res = await axios.post<ChatResponse>("/chat/", formData, {
        withCredentials: true,
        headers: {"Content-Type": "multipart/form-data"},
    });
    return res.data;
};

export const getMessagesByChatId = async (chatId: string): Promise<Message[]> => {
    const res = await axios.get<Message[]>(`/message/${chatId}`, {
        withCredentials: true,
    });
    return res.data;
};

export const sendMessageToAI = async (
    chatId: string,
    message: string
): Promise<Message> => {
    const trimmedChatId = chatId?.trim();
    const trimmedMessage = message?.trim();
    if (!trimmedChatId || !trimmedMessage) throw new Error("Invalid chatId or message");

    const res = await axios.post<{
        ans: string;
        id: string;
        created_at: string;
    }>(
        "/ai/ask",
        {chat_id: trimmedChatId, question: trimmedMessage},
        {withCredentials: true}
    );

    return {
        id: res.data.id,
        role: "assistant",
        content: res.data.ans,
        created_at: res.data.created_at,
    };
};


export const uploadFiles = async (
    chatId: string,
    files: File[]
): Promise<UploadedFile[]> => {
    if (!chatId?.trim() || !files?.length) return [];

    const form = new FormData();
    form.append("chat_id", chatId.trim());
    for (const f of files) form.append("files", f);

    const res = await axios.post<UploadedFile[]>("/file/upload", form, {
        withCredentials: true,
        headers: {"Content-Type": "multipart/form-data"},
    });
    return res.data;
};