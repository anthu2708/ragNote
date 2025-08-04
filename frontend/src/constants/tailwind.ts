// src/constants/tailwind.ts
export const STROKE_EFFECT = '' +
    'gradient-stroke '  +
    'rounded-[24px] ' +
    'overflow-hidden  ' +
    'shadow-[4px_4px_20px_rgba(0,0,0,0.2)]';
export const CARD_EFFECT = `
  bg-gradient-card
  flex
  flex-col
  justify-between
  p-6
  text-white
  z-10
`;
export const BUTTON_EFFECT = `px-4 py-2
  bg-gradient-button
  flex
  flex-col
  justify-between
  p-6
  text-white
  z-10
  hover:bg-opacity-70 `

export const CHAT_BUBBLE_USER = `
  bg-white/10 bg-opacity-70 text-white/50 font-bold
  backdrop-blur-30 
  text-sm rounded-2xl px-4 py-2 max-w-[70%]
`;

export const CHAT_BUBBLE_RESPONSE = `
  bg-gradient-chat-response text-chat font-semibold
  text-sm rounded-2xl px-4 py-2 max-w-[70%]
  
`;