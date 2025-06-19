const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const userDetails = require('./userDetails');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://DemoUser:DemoUser@coder.c1plib1.mongodb.net/?retryWrites=true&w=majority&appName=Coder', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to local MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// User Schema (define only once, with all fields)
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    totalProblemsSolved: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    solvedProblemIds: { type: [Number], default: [] },
    attemptedProblemIds: { type: [Number], default: [] },
    lastSolved: { type: String, default: '' }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Authentication Middleware
const authenticateUser = async (req, res, next) => {
    const userId = req.headers['user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'User ID is required' });
    }

    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(401).json({ error: 'Invalid user ID' });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};





// User Validation Endpoints
app.post('/api/validate-user', async (req, res) => {
    try {
        const { userId, password } = req.body;
        const user = await User.findOne({ userId });
        console.log('Login attempt:', { userId, password });
        if (!user) {
            return res.status(401).json({ valid: false, error: 'Invalid credentials' });
        }
        if (password !== user.password) {
            return res.status(401).json({ valid: false, error: 'Invalid credentials' });
        }
        // Return user data (excluding password)
        const userData = {
            userId: user.userId,
            name: user.name,
            solvedProblems: user.solvedProblemIds,
            lastSolved: user.lastSolved,
            easySolved: user.easySolved,
            mediumSolved: user.mediumSolved,
            hardSolved: user.hardSolved
        };
        res.json({ valid: true, user: userData });
    } catch (error) {
        res.status(500).json({ error: 'Error validating user' });
    }
});

// Register New User
app.post('/api/register', async (req, res) => {
    try {
        const { userId, name, password } = req.body;
        const existingUser = await User.findOne({ userId });
        if (existingUser) {
            return res.status(400).json({ error: 'User ID already exists' });
        }
        console.log('Registering user:', { userId, name, password });
        const user = new User({
            userId,
            name,
            password
        });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error registering user' });
    }
});

// Get User Progress (Protected Route)
app.get('/api/user-progress', authenticateUser, async (req, res) => {
    try {
        console.log('[DEBUG] /api/user-progress called for user:', req.user.userId);
        const user = await User.findOne({ userId: req.user.userId });
        if (!user) {
            console.log('[DEBUG] User not found:', req.user.userId);
            return res.status(404).json({ error: 'User not found' });
        }
        console.log('[DEBUG] User progress:', {
            solvedProblemIds: user.solvedProblemIds,
            attemptedProblemIds: user.attemptedProblemIds,
            totalProblemsSolved: user.totalProblemsSolved
        });
        res.json({
            solvedProblemIds: user.solvedProblemIds,
            attemptedProblemIds: user.attemptedProblemIds,
            totalProblemsSolved: user.totalProblemsSolved,
            easySolved: user.easySolved,
            mediumSolved: user.mediumSolved,
            hardSolved: user.hardSolved
        });
    } catch (error) {
        console.error('Error fetching user progress:', error);
        res.status(500).json({ error: 'Failed to fetch user progress' });
    }
});

// Update Solved Problem (Protected Route)
app.post('/api/update-solved', authenticateUser, async (req, res) => {
    try {
        const { problemId, difficulty } = req.body;
        const updatedUser = await userDetails.updateSolvedProblems(
            req.user.userId,
            problemId,
            difficulty
        );
        
        if (!updatedUser) {
            return res.status(400).json({ error: 'Failed to update solved problem' });
        }

        res.json({
            message: 'Problem marked as solved',
            user: {
                totalProblemsSolved: updatedUser.totalProblemsSolved,
                easySolved: updatedUser.easySolved,
                mediumSolved: updatedUser.mediumSolved,
                hardSolved: updatedUser.hardSolved
            }
        });
    } catch (error) {
        console.error('Error updating solved problem:', error);
        res.status(500).json({ error: 'Failed to update solved problem' });
    }
});

// Check if Problem is Solved (Protected Route)
app.get('/api/check-solved/:problemId', authenticateUser, async (req, res) => {
    try {
        const isSolved = await userDetails.hasSolvedProblem(
            req.user.userId,
            parseInt(req.params.problemId)
        );
        res.json({ solved: isSolved });
    } catch (error) {
        console.error('Error checking solved status:', error);
        res.status(500).json({ error: 'Failed to check solved status' });
    }
});

// Update User Profile (Protected Route)
app.put('/api/update-profile', authenticateUser, async (req, res) => {
    try {
        const { name } = req.body;
        const user = await User.findOne({ userId: req.user.userId });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.name = name;
        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                name: user.name,
                userId: user.userId,
                totalProblemsSolved: user.totalProblemsSolved,
                easySolved: user.easySolved,
                mediumSolved: user.mediumSolved,
                hardSolved: user.hardSolved
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get User Statistics (Protected Route)
app.get('/api/user-stats', authenticateUser, async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate additional statistics
        const stats = {
            name: user.name,
            userId: user.userId,
            totalProblemsSolved: user.totalProblemsSolved,
            easySolved: user.easySolved,
            mediumSolved: user.mediumSolved,
            hardSolved: user.hardSolved,
            solvedProblemIds: user.solvedProblemIds,
            attemptedProblemIds: user.attemptedProblemIds,
            // Additional statistics
            completionRate: user.totalProblemsSolved > 0 ? 
                ((user.easySolved + user.mediumSolved + user.hardSolved) / user.totalProblemsSolved * 100).toFixed(1) : 0,
            lastSolved: user.lastSolved
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
});

// Update Problem Status (attempted/solved)
app.post('/api/update-problem-status', authenticateUser, async (req, res) => {
    try {
        const { problemId, status, difficulty } = req.body;
        console.log('[DEBUG] /api/update-problem-status called:', { userId: req.user.userId, problemId, status, difficulty });
        const updatedUser = await userDetails.updateProblemStatus(
            req.user.userId,
            problemId,
            status,
            difficulty
        );
        if (!updatedUser) {
            console.log('[DEBUG] Failed to update problem status for user:', req.user.userId);
            return res.status(400).json({ error: 'Failed to update problem status' });
        }
        console.log('[DEBUG] Updated user after problem status change:', {
            solvedProblemIds: updatedUser.solvedProblemIds,
            attemptedProblemIds: updatedUser.attemptedProblemIds,
            totalProblemsSolved: updatedUser.totalProblemsSolved
        });
        res.json({
            message: 'Problem status updated',
            user: {
                totalProblemsSolved: updatedUser.totalProblemsSolved,
                easySolved: updatedUser.easySolved,
                mediumSolved: updatedUser.mediumSolved,
                hardSolved: updatedUser.hardSolved,
                solvedProblemIds: updatedUser.solvedProblemIds,
                attemptedProblemIds: updatedUser.attemptedProblemIds
            }
        });
    } catch (error) {
        console.error('Error updating problem status:', error);
        res.status(500).json({ error: 'Failed to update problem status' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT_BACKEND = process.env.PORT_BACKEND || 5000;
app.listen(PORT_BACKEND, () => {
    console.log(`Server is running on port ${PORT_BACKEND}`);
}); 