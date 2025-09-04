/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      screens: {
        mini: '300px', // breakpoint mới
      },
      colors: {
        sidebar: '#704096',
        minsColor: '#E2E2E2',
        dashboardButton: '#D3C0FF'
      },
      backgroundImage: {
        'gradient-card': 'linear-gradient(45deg, rgba(211,195,255,0.2) -0%, rgba(255,255,255,0.25) 44%, rgba(112,64,150,0.2) 170%)',
        'gradient-button': 'linear-gradient(145deg, rgba(255,255,255,0.2) 22%, rgba(255,255,255,0.4) 74%, rgba(93,41,107,0.2) 100%)',
        'gradient-ava': 'linear-gradient(136deg, #151095 0%, #FFB1F1 100%)',
        'gradient-stroke': 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(109,109,109,0.6) 76%, rgba(112,64,150,0.1) 100%)',
        'gradient-chat-response': 'linear-gradient(90deg, rgba(93,41,107,0.8) 0%, rgba(34,148,197,0.5) 80%)',
      },
      backdropBlur: {
        '50': '50px',
      },
      textColor: {
        chat: '#22122F',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
  variants: {
    scrollbar: ['rounded'],
  }
}
