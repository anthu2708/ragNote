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
  timestamp?: string;
}


export const getAllChats = async (): Promise<Project[]> => {
  const res = await axios.get<Project[]>('/chat/', { withCredentials: true })
  return res.data
}

export const createChat = async (title: string, file: File): Promise<void> => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("files", file);

  await axios.post("/chat/", formData, {
    withCredentials: true,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
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

  if (!trimmedChatId || !trimmedMessage) {
    throw new Error("Invalid chatId or message");
  }

  const res = await axios.post<Message>(
    "/ai/ask",
    { chat_id: trimmedChatId, question: trimmedMessage },
    { withCredentials: true }
  );
  return res.data;
};
