import { Request, Response } from 'express';
import db from '../config/db';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Secret key for JWT signing
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTc0MzQyODc5NCwiaWF0IjoxNzQzNDI4Nzk0fQ.kBHSPAmtaKrNay21APpf-zRLh9ZdHRXhK1ZVIrixU3I';

// Helper function to generate JWT token
const generateToken = (userId: string) => {
    return jwt.sign({ userId }, JWT_SECRET_KEY, { expiresIn: '1h' });
};

// Registration logic
export const registerUser = async (req: Request, res: Response): Promise<void> => {
    // Destructure new fields from request body
    const { name, surname, email, password, preferences, disabilityTypes } = req.body;

    // Validate that preferences is an array with at least 3 items
    if (!Array.isArray(preferences) || preferences.length < 3) {
        res.status(400).json({ message: 'Please select at least 3 preferences.' });
        return;
    }

    // Validate that disabilityTypes is an array with at least one item
    if (!Array.isArray(disabilityTypes) || disabilityTypes.length < 1) {
        res.status(400).json({ message: 'Please select at least one disability type.' });
        return;
    }

    try {
        // Check if user already exists
        const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database including preferences and disabilityTypes
        const result = await db.query(
            'INSERT INTO users (name, surname, email, password, preferences, disability_types) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, surname, email, hashedPassword, JSON.stringify(preferences), JSON.stringify(disabilityTypes)]
        );

        const user = result.rows[0];

        // Generate a JWT token for the new user
        const token = generateToken(user.id);

        res.status(201).json({ message: 'Registration successful', token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login logic remains unchanged
export const loginUser = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
        const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length === 0) {
            res.status(400).json({ message: 'User not found' });
            return;
        }

        const user = existingUser.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const token = generateToken(user.id);
        res.status(200).json({ message: 'Login successful', token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};