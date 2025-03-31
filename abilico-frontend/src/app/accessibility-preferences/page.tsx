'use client';
import { useState } from 'react';

export default function Page() {
    const [preferences, setPreferences] = useState<string[]>([]);
    const [disabilityType, setDisabilityType] = useState<string>('');

    // Options for accessibility preferences
    const preferenceOptions = [
        "Entrance Accessibility",
        "Indoor Mobility",
        "Restroom Facilities",
        "Seating & Table Accommodations",
        "Parking & Transportation",
        "Staff Awareness and Assistance",
        "Emergency Preparedness",
        "Visual & Auditory Support"
    ];

    // Handle preference change
    const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setPreferences((prev) =>
            checked ? [...prev, value] : prev.filter((item) => item !== value)
        );
    };

    // Handle disability type change
    const handleDisabilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setDisabilityType(e.target.value);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Post the preferences and disability type to the backend (API)
        const token = localStorage.getItem('authToken');
        const res = await fetch('http://localhost:5001/api/auth/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                preferences,
                disabilityType,
            }),
        });

        if (res.status === 200) {
            alert('Preferences updated successfully!');
            // Redirect to another page or show a confirmation
        } else {
            alert('Failed to update preferences');
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <h2 className="text-center mb-4">Accessibility Preferences</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <h3>Select Your Preferences (Choose 3-5)</h3>
                    {preferenceOptions.map((option) => (
                        <div key={option}>
                            <input
                                type="checkbox"
                                value={option}
                                onChange={handlePreferenceChange}
                                id={option}
                            />
                            <label htmlFor={option}>{option}</label>
                        </div>
                    ))}
                </div>
                <div>
                    <h3>Select Your Disability Type (Optional)</h3>
                    <select value={disabilityType} onChange={handleDisabilityChange}>
                        <option value="">Select Disability</option>
                        <option value="Wheelchair">Wheelchair</option>
                        <option value="Reduced Mobility">Reduced Mobility</option>
                        <option value="Visual Impairment">Visual Impairment</option>
                        <option value="Hearing Impairment">Hearing Impairment</option>
                    </select>
                </div>
                <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded w-full">
                    Save Preferences
                </button>
            </form>
        </div>
    );
}