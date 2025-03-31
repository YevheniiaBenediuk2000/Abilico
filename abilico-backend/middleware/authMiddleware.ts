import {NextFunction, Request, Response} from 'express';

import {JwtPayload, verify} from 'jsonwebtoken';

interface CustomRequest extends Request {
    user?: string | JwtPayload;
}

const authMiddleware = (req: CustomRequest, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        req.user = verify(token, 'your-secret-key');  // Add user data to request object
        next();  // Proceed to next middleware or route handler
    } catch (error) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};

export default authMiddleware;