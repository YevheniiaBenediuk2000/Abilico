import { Request, Response } from 'express';
import db from '../config/db';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Secret key for JWT signing
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'yourSecretKey'; // Make sure to change this for production

// Helper function to generate JWT token
const generateToken = (userId: string) => {
    return jwt.sign({ userId }, JWT_SECRET_KEY, { expiresIn: '1h' });
};

// Registration logic
export const registerUser = async (req: Request, res: Response): Promise<void> => {
    const { name, surname, email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        // Send a response if the user already exists (without using return)
        if (existingUser.rows.length > 0) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = await db.query(
            'INSERT INTO users (name, surname, email, password) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, surname, email, hashedPassword]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = generateToken(user.id);

        // Send the token to the client along with the user data
        res.status(201).json({ message: 'Registration successful', token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login logic
export const loginUser = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
        const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (existingUser.rows.length === 0) {
            res.status(400).json({ message: 'User not found' });
            return;
        }

        const user = existingUser.rows[0];

        // Compare password with hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        // Generate JWT token
        const token = generateToken(user.id);

        // Send the token to the client along with the user data
        res.status(200).json({ message: 'Login successful', token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};