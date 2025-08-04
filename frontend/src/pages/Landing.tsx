import { useNavigate } from 'react-router-dom';
import { STROKE_EFFECT } from '../constants/tailwind';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cover bg-center bg-[url('/src/assets/bg.png')] flex items-center justify-center px-4 text-white">
      <div className="w-full max-w-md bg-white/20 backdrop-blur-md rounded-3xl p-10 shadow-xl space-y-6 text-center">
        <h2 className="text-4xl font-bold drop-shadow-xl">Welcome to QuickNote</h2>
        <p className="text-md text-gray-300 drop-shadow-md">
          Capture ideas. Share knowledge. Boost productivity.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-4">
          <div className={STROKE_EFFECT}>
            <button
              onClick={() => navigate('/login')}
              className="font-medium px-8 py-2 w-36 bg-gradient-chat-response drop-shadow-lg backdrop-blur-xl rounded-full text-white text-lg hover:opacity-90 transition"
            >
              Login
            </button>
          </div>
          <div className={STROKE_EFFECT}>
            <button
              onClick={() => navigate('/register')}
              className="font-medium px-8 py-2 w-36 bg-gradient-button drop-shadow-lg backdrop-blur-xl rounded-full text-white text-lg hover:opacity-90 transition"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
