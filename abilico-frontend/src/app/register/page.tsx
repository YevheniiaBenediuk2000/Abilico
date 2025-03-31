'use client';
import React, { useState } from 'react';

// The list of possible accessibility preferences
const possiblePreferences = [
    'Entrance Accessibility',
    'Indoor Mobility',
    'Restroom Facilities',
    'Seating & Table Accommodations',
    'Parking & Transportation',
    'Visual & Auditory Support',
    'Emergency Preparedness',
    'Staff Awareness and Assistance',
];

// The list of possible disability types
const possibleDisabilities = [
    'Wheelchair User',
    'Visually Impaired',
    'Hearing Impaired',
    'Other',
];

export default function RegisterPage() {
    // We'll use one state for both login and registration.
    const [form, setForm] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
        preferences: [] as string[],
        disabilityTypes: [] as string[],
    });
    const [isLogin, setIsLogin] = useState(false);

    // Password validation for registration
    const validatePassword = (password: string) => {
        // At least 8 characters, one uppercase, one lowercase, one digit, one special character.
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])[A-Za-z\d@$!%*?&#^]{8,}$/;
        return regex.test(password);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleTogglePreference = (pref: string) => {
        const { preferences } = form;
        if (preferences.includes(pref)) {
            setForm({
                ...form,
                preferences: preferences.filter((p) => p !== pref),
            });
        } else {
            if (preferences.length < 5) {
                setForm({ ...form, preferences: [...preferences, pref] });
            } else {
                alert('You can select up to 5 preferences.');
            }
        }
    };

    const handleToggleDisability = (disability: string) => {
        const { disabilityTypes } = form;
        if (disabilityTypes.includes(disability)) {
            setForm({
                ...form,
                disabilityTypes: disabilityTypes.filter((d) => d !== disability),
            });
        } else {
            setForm({ ...form, disabilityTypes: [...disabilityTypes, disability] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLogin) {
            // Login mode: only require email and password
            if (!form.email || !form.password) {
                alert('Please provide both email and password for login.');
                return;
            }

            try {
                const response = await fetch('http://localhost:5001/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Send only email and password for login
                    body: JSON.stringify({ email: form.email, password: form.password }),
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Login successful!');
                    console.log('Logged in user:', data.user);
                    localStorage.setItem('authToken', data.token);
                    // Optionally clear fields
                    setForm({ ...form, password: '' });
                } else {
                    alert(`Login failed: ${data.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Server error:', error);
                alert('Server error. Check console.');
            }
        } else {
            // Registration mode validations
            if (!validatePassword(form.password)) {
                alert(
                    'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character.'
                );
                return;
            }
            if (form.preferences.length < 3) {
                alert('Please select at least 3 preferences.');
                return;
            }
            if (form.disabilityTypes.length < 1) {
                alert('Please select at least one disability type.');
                return;
            }

            try {
                const response = await fetch('http://localhost:5001/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Registration successful!');
                    console.log('Registered user:', data.user);
                    localStorage.setItem('authToken', data.token);
                    // Clear the registration fields
                    setForm({
                        name: '',
                        surname: '',
                        email: '',
                        password: '',
                        preferences: [],
                        disabilityTypes: [],
                    });
                } else {
                    alert(`Registration failed: ${data.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Server error:', error);
                alert('Server error. Check console.');
            }
        }
    };

    return (
        <div className="max-w-md mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">{isLogin ? 'Login' : 'Register'}</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                {isLogin ? (
                    <>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </>
                ) : (
                    <>
                        <input
                            type="text"
                            name="name"
                            placeholder="Name"
                            value={form.name}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                        <input
                            type="text"
                            name="surname"
                            placeholder="Surname"
                            value={form.surname}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                        <div>
                            <p className="font-semibold mb-2">
                                Choose 3–5 accessibility categories that matter most to you.
                            </p>
                            <ul className="space-y-1">
                                {possiblePreferences.map((pref) => (
                                    <li key={pref}>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={form.preferences.includes(pref)}
                                                onChange={() => handleTogglePreference(pref)}
                                            />
                                            <span>{pref}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="font-semibold mb-2">
                                Select your disability types (choose one or more):
                            </p>
                            <ul className="space-y-1">
                                {possibleDisabilities.map((disability) => (
                                    <li key={disability}>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={form.disabilityTypes.includes(disability)}
                                                onChange={() => handleToggleDisability(disability)}
                                            />
                                            <span>{disability}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
                <button
                    type="submit"
                    className="bg-blue-500 text-white py-2 px-4 rounded w-full"
                >
                    {isLogin ? 'Login' : 'Register'}
                </button>
            </form>
            <p className="text-center mt-4">
                {isLogin ? (
                    <span>
            Don't have an account?{' '}
                        <button onClick={() => setIsLogin(false)} className="text-blue-500 underline">
              Register
            </button>
          </span>
                ) : (
                    <span>
            Already have an account?{' '}
                        <button onClick={() => setIsLogin(true)} className="text-blue-500 underline">
              Login
            </button>
          </span>
                )}
            </p>
        </div>
    );
}