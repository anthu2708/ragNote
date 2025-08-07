import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {STROKE_EFFECT} from '../constants/tailwind';
import { register } from "../utils/auth";

const Register = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [name, setName] = useState('');

    const handleRegister = async () => {
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        const trimmedConfirm = confirm.trim();
        const trimmedName = name.trim();

        if (!trimmedName) {
            alert('Please enter your full name.');
            return;
        }

        if (!trimmedEmail) {
            alert('Please enter your email address.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            alert('Please enter a valid email address.');
            return;
        }

        if (!trimmedPassword) {
            alert('Please enter a password.');
            return;
        }

        if (trimmedPassword.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        if (trimmedPassword !== trimmedConfirm) {
            alert('Passwords do not match.');
            return;
        }

        try {
            await register(trimmedName, trimmedEmail, trimmedPassword);
            navigate('/dashboard');
        } catch (err) {
            console.error('Registration failed', err);
            alert('Registration failed');
        }
    };


    return (
        <div
            className="min-h-screen bg-cover bg-center bg-[url('/src/assets/bg.png')] flex items-center justify-center px-4 text-white">
            <div className="w-full max-w-md bg-white/20 backdrop-blur-md rounded-3xl p-10 shadow-xl space-y-6">
                <h2 className="text-4xl font-bold text-center drop-shadow-xl">Create Account</h2>
                <p className="text-md text-gray-300 text-center drop-shadow-md">Register to start organizing your
                    notes</p>


                <div className="space-y-4">
                    <input
                        className="w-full p-3 pl-5 rounded-full bg-gray-900/40 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-sm"
                        placeholder="Name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        className="w-full p-3 pl-5 rounded-full bg-gray-900/40 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-sm"
                        placeholder="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        className="w-full p-3 pl-5 rounded-full bg-gray-900/40 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-sm"
                        placeholder="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <input
                        className="w-full p-3 pl-5 rounded-full bg-gray-900/40 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-sm"
                        placeholder="Confirm Password"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                    />

                    <div className={STROKE_EFFECT}>
                        <button
                            onClick={handleRegister}
                            className="w-full font-medium px-5 py-2 bg-gradient-chat-response drop-shadow-lg backdrop-blur-xl rounded-full text-white text-lg hover:opacity-90 transition"
                        >
                            Register
                        </button>
                    </div>
                </div>

                <div className="text-center text-sm text-gray-300">
                    Already have an account?{' '}
                    <button className="text-blue-300 hover:underline" onClick={() => navigate('/login')}>
                        Login here
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Register;
