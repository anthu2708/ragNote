import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STROKE_EFFECT } from '../constants/tailwind';
import {login} from "../utils/auth"; // Same stroke used in Landing

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-[url('/src/assets/bg.png')] flex items-center justify-center px-4 text-white">
      <div className="w-full max-w-md bg-white/20 backdrop-blur-md rounded-3xl p-10 shadow-xl space-y-6">
        <h2 className="text-4xl font-bold text-center drop-shadow-xl">Welcome Back</h2>
        <p className="text-md text-gray-300 text-center drop-shadow-md">Log in to access your projects</p>

        <div className="space-y-4">
          <input
            className="w-full p-3 pl-5 rounded-full bg-gray-900/40   text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-sm"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full p-3 pl-5 rounded-full bg-gray-900/40  text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-sm"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className={STROKE_EFFECT}>
            <button
              onClick={handleLogin}
              className="w-full font-medium px-5 py-2 bg-gradient-chat-response drop-shadow-lg backdrop-blur-xl rounded-full text-white text-lg hover:opacity-90 transition"
            >
              Login
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-300">
          Don’t have an account?{' '}
          <button className="text-blue-300 hover:underline" onClick={() => navigate('/register')}>
            Register here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
