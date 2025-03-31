import * as express from 'express';
import * as dotenv from 'dotenv';
import * as cors from 'cors';
import authRoutes from './routes/authRoutes';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// Allow CORS for frontend
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from frontend
    methods: ['GET', 'POST'], // Allow GET and POST requests
    credentials: true, // Allow cookies if needed
}));

app.use(express.json());
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});