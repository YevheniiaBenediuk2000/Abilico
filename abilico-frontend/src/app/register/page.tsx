'use client';
import { useState } from 'react';

export default function RegisterLoginPage() {
    const [form, setForm] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
    });
    const [isLogin, setIsLogin] = useState(false);  // Toggle between login and register

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = isLogin ? 'http://localhost:5001/api/auth/login' : 'http://localhost:5001/api/auth/register';
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(form),
        });

        const data = await res.json();
        console.log('Response:', data);

        if (res.status === 200 || res.status === 201) {
            // Store the token (save it in localStorage or cookies)
            localStorage.setItem('authToken', data.token); // Store token in localStorage

            // Redirect the user to the accessibility preferences page after registration/login
            window.location.href = '/accessibility-preferences';  // Adjust the path based on your routing setup

            // Reset the form if it's a registration
            if (!isLogin) {
                setForm({
                    name: '',
                    surname: '',
                    email: '',
                    password: '',
                });
            }
        } else {
            alert('Error during registration/login');
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <h2 className="text-center mb-4">{isLogin ? 'Login' : 'Register'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <>
                        <input
                            type="text"
                            name="name"
                            placeholder="Name"
                            value={form.name}
                            onChange={handleChange}
                            className="mb-2 p-2 border w-full"
                        />
                        <input
                            type="text"
                            name="surname"
                            placeholder="Surname"
                            value={form.surname}
                            onChange={handleChange}
                            className="mb-2 p-2 border w-full"
                        />
                    </>
                )}
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    className="mb-2 p-2 border w-full"
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className="mb-4 p-2 border w-full"
                />
                <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded w-full">
                    {isLogin ? 'Login' : 'Register'}
                </button>
            </form>

            <p className="text-center mt-4">
                {isLogin ? (
                    <span>
                        Don&#39;t have an account?{' '}
                        <button
                            onClick={() => setIsLogin(false)}
                            className="text-blue-500 underline"
                        >
                            Register
                        </button>
                    </span>
                ) : (
                    <span>
                        Already have an account?{' '}
                        <button
                            onClick={() => setIsLogin(true)}
                            className="text-blue-500 underline"
                        >
                            Login
                        </button>
                    </span>
                )}
            </p>
        </div>
    );
}