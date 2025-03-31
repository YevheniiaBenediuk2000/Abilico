import { RequestHandler, Request } from 'express';
import db from '../config/db';

export const saveUserPreferences: RequestHandler = async (req: Request & { user?: { id: string } }, res, next) => {
    try {
        const { preferences } = req.body;

        // Validate preferences
        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({ message: 'Invalid preferences provided.' });
        }

        // Extract userId from req.user
        const userId = req.user?.id; // Type-safe
        if (!userId) {
            return res.status(400).json({ message: 'No user ID found in request.' });
        }

        // Database update for user preferences
        await db.query(
            'UPDATE users SET preferences = $1 WHERE id = $2',
            [preferences, userId]
        );

        // Send success response
        res.status(204).send(); // No content response
    } catch (error) {
        console.error('Error saving user preferences:', error);
        next(error); // Pass error to centralized error handler
    }
};