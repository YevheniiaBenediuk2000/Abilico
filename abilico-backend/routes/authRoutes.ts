import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController';
import { saveUserPreferences } from '../controllers/usersController';
// Optionally import authMiddleware if you want to protect the route
// import authMiddleware from '../middleware/authMiddleware';

const router = Router();

// Register route
router.post('/register', registerUser);

// Login route
router.post('/login', loginUser);

// Protect this route if you want a token required:
router.post('/users/preferences', /*authMiddleware,*/ saveUserPreferences);

export default router;