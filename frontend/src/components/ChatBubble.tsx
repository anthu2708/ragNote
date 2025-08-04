import React from 'react';
import {CHAT_BUBBLE_RESPONSE, CHAT_BUBBLE_USER, STROKE_EFFECT} from "../constants/tailwind";

interface ChatBubbleProps {
  message: string;
  type: 'user' | 'assistant';
  fileName?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, type, fileName }) => {
  // Tailwind classes cho từng loại
  const baseClasses =
    'text-chat text-sm rounded-2xl px-4 py-2 w-full break-words shadow-md transition-all duration-300';

  const userClasses =
    `${CHAT_BUBBLE_USER}`;

  const responseClasses =
    `${CHAT_BUBBLE_RESPONSE}`;

  return (
    <div className={`flex w-full ${type === 'user' ? 'justify-end' : 'justify-start'}`}>
  <div className={`${baseClasses} ${STROKE_EFFECT} ${type === 'user' ? userClasses : responseClasses} max-w-[80%]`}>
    <p>{message}</p>
    {fileName && (
      <div className="mt-2 bg-white/10 p-2 rounded-md text-xs text-white flex items-center gap-1">
        {fileName}
      </div>
    )}
  </div>
</div>

  );
};

export default ChatBubble;
