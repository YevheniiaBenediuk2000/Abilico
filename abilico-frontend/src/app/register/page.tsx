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
    'Cognitive Disability',
    'Other',
];

export default function RegisterLoginPage() {
    // Toggle between login and registration
    const [isLogin, setIsLogin] = useState(false);

    // State for registration form
    const [form, setForm] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
        preferences: [] as string[],
        disabilityTypes: [] as string[],
    });

    // State for login form
    const [loginForm, setLoginForm] = useState({
        email: '',
        password: '',
    });

    // Update registration fields
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // Update login fields
    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
    };

    // Toggle accessibility preference selection
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

    // Toggle disability type selection
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

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLogin) {
            // Login submission
            try {
                const response = await fetch('http://localhost:5001/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginForm),
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Login successful!');
                    console.log('Logged in user:', data.user);
                    // Optionally store the token
                    localStorage.setItem('authToken', data.token);
                    // Reset login form
                    setLoginForm({ email: '', password: '' });
                } else {
                    alert(`Login failed: ${data.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Server error:', error);
                alert('Server error. Check console.');
            }
        } else {
            // Registration submission
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
                    // Optionally store the token
                    localStorage.setItem('authToken', data.token);
                    // Clear the registration form
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
                            value={loginForm.email}
                            onChange={handleLoginChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={loginForm.password}
                            onChange={handleLoginChange}
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