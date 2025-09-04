import axios from './axios'

/** ========= Types ========= */
export interface Project {
    id: string
    title: string
    updated_at: string
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
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

export type PresignResp = {
    url: string;
    fields: Record<string, string>;
    file_id: string;
    key: string;
};

export type ConfirmResp = { ok: boolean };

export interface MessageOut {
    id: string;
    content: string;
    created_at: string;
}


/** ========= Chats ========= */

export const getAllChats = async (): Promise<Project[]> => {
    const res = await axios.get<Project[]>('/chat/', {withCredentials: true})
    return res.data
}

export const getChatTitle = async (chatId: string): Promise<string> => {
    const res = await axios.get<{ title: string }>(`/chat/title/${chatId}`, {
        withCredentials: true
    });
    return res.data.title;
};

export const createChat = async (title: string): Promise<ChatResponse> => {
    if (!title?.trim()) {
        throw new Error("Title are required.");
    }

    const formData = new FormData();
    formData.append("title", title.trim());

    const res = await axios.post<ChatResponse>("/chat/minimal", formData, {
        withCredentials: true,
        headers: {"Content-Type": "multipart/form-data"},
    });
    return res.data;
};

export const deleteChat = async (chatId: string): Promise<void> => {
    if (!chatId?.trim()) throw new Error("Invalid chatId");
    await axios.delete(`/chat/${chatId}`, {withCredentials: true});
};


/** ========= Messages ========= */

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

    const res = await axios.post<MessageOut>(
        "/ai/ask",
        {chat_id: trimmedChatId, question: trimmedMessage},
        {withCredentials: true}
    );

    return {
        id: res.data.id,
        role: "assistant",
        content: res.data.content,
        created_at: res.data.created_at,
    };
};
;

/** ========= File uploads (direct -> backend) ========= */

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

/** ========= File uploads (browser -> S3 via presigned POST) ========= */

export async function presignByKey(payload: {
    contentType: string;
    size: number;
    filename: string
}): Promise<PresignResp> {
    console.log("[API] presign-by-key request", payload);
    const res = await axios.post<PresignResp>(
        "/file/presign-by-key",
        payload,
        {withCredentials: true});
    console.log("[API] presign-by-key response", res.status, res.data);
    return res.data;
}

export async function confirmS3Upload(payload: {
    file_id: string;
    etag: string;
    s3_url: string;
    size: number;
    mime: string;
}): Promise<ConfirmResp> {
    console.log("[API] confirm request", payload.file_id);
    const res = await axios.post<ConfirmResp>(
        "/file/confirm",
        payload,
        {withCredentials: true});
    console.log("[API] confirm response", res.status, res.data);
    return res.data;
}

export function uploadToS3ViaPresignedPost(
    url: string,
    fields: Record<string, string>,
    file: File,
    onProgress?: (pct: number) => void
): Promise<{ etag: string; location: string }> {
    return new Promise((resolve, reject) => {
        const fd = new FormData();
        Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
        fd.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.responseType = "document";
        xhr.withCredentials = false;
        xhr.timeout = 300000;
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
            console.log("[S3] onprogress", e.loaded, "/", e.total, "lc=", e.lengthComputable);

        };
        xhr.ontimeout = () => reject(new Error("S3 upload timeout"));
        xhr.onreadystatechange = () => {
            console.log("[S3] readyState", xhr.readyState, "status", xhr.status);
            if (xhr.readyState !== 4) return;
            if (xhr.status === 201) {
                const xml = xhr.responseXML;
                const etag = xml?.getElementsByTagName("ETag")[0]?.textContent ?? "";
                const location = xml?.getElementsByTagName("Location")[0]?.textContent ?? "";
                console.log("[S3] 201 success", {etag, location});
                resolve({etag: etag.replace(/"/g, ""), location});
            } else if (xhr.status === 204) {
                const etag = xhr.getResponseHeader("ETag") ?? "";
                console.log("[S3] 204 success", {etag});
                resolve({etag: etag.replace(/"/g, ""), location: ""});
            } else {
                const text = xhr.responseText || "";
                console.error("[S3] failed", xhr.status, text.slice(0, 300));
                reject(new Error(`S3 upload failed ${xhr.status}`));
            }
        };
        xhr.ontimeout = () => reject(new Error("S3 upload timeout"));
        xhr.onerror = () => {
            console.error("[S3] network error");
            reject(new Error("Network error"));
        };

        console.log("[S3] POST", url, "fields", Object.keys(fields));
        xhr.open("POST", url);
        xhr.send(fd);
    });
}


export async function attachFiles(payload: { chat_id: string; file_ids: string[] }) {
    const res = await axios.post("/file/attach", payload, {withCredentials: true});
    return res.data;
}

export async function discardFiles(payload: { file_ids: string[] }) {
    const res = await axios.post("/file/discard", payload, {withCredentials: true});
    return res.data;
}

export async function ingestFileNow(file_id: string) {
    const url = `/file/ingest/${file_id}`;
    const res = await axios.post(
        url,
        null,
        {withCredentials: true}
    );
    return res.data;
}