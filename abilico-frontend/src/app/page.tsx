'use client';
import React, { useState } from 'react';

// The list of possible preferences
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

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    preferences: [] as string[], // store selected preferences
  });

  // Handle text input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle preference checkbox toggles
  const handleTogglePreference = (pref: string) => {
    const { preferences } = form;
    if (preferences.includes(pref)) {
      // Remove if already selected
      setForm({
        ...form,
        preferences: preferences.filter((p) => p !== pref),
      });
    } else {
      // Add new preference if less than 5 selected
      if (preferences.length < 5) {
        setForm({ ...form, preferences: [...preferences, pref] });
      } else {
        alert('You can select up to 5 preferences.');
      }
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least 3 preferences
    if (form.preferences.length < 3) {
      alert('Please select at least 3 preferences.');
      return;
    }

    try {
      // Send registration data (including preferences) to your backend
      const response = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (response.ok) {
        alert('Registration successful!');
        console.log('Registered user:', data.user);
        // Optionally clear form or navigate somewhere else
        setForm({
          name: '',
          surname: '',
          email: '',
          password: '',
          preferences: [],
        });
      } else {
        alert(`Registration failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Server error:', error);
      alert('Server error. Check console.');
    }
  };

  return (
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Register</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic fields */}
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

          {/* Preferences selection */}
          <div>
            <p className="font-semibold mb-2">Choose 3–5 accessibility categories that matter most to you.</p>
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

          <button
              type="submit"
              className="bg-blue-500 text-white py-2 px-4 rounded w-full"
          >
            Continue
          </button>
        </form>
      </div>
  );
}