const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
mongoose.connect('mongodb+srv://DemoUser:DemoUser@coder.c1plib1.mongodb.net/?retryWrites=true&w=majority&appName=Coder', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to local MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// User Schema (single source of truth)
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

// User data structure and management
const userDetails = {
    // Get user by userId
    getUserById: async function(userId) {
        try {
            return await User.findOne({ userId });
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },

    // Add new user
    addUser: async function(userData) {
        try {
            const newUser = new User({
                name: userData.name,
                userId: userData.userId,
                password: userData.password,
                totalProblemsSolved: 0,
                easySolved: 0,
                mediumSolved: 0,
                hardSolved: 0,
                solvedProblemIds: [],
                attemptedProblemIds: [],
                lastSolved: ''
            });
            await newUser.save();
            return newUser;
        } catch (error) {
            console.error('Error adding user:', error);
            return null;
        }
    },

    // Update problem status (attempted/solved)
    updateProblemStatus: async function(userId, problemId, status, difficulty) {
        try {
            const user = await User.findOne({ userId });
            if (!user) return null;

            if (status === 'solved') {
                if (!user.solvedProblemIds.includes(problemId)) {
                    user.solvedProblemIds.push(problemId);
                    user.totalProblemsSolved++;
                    switch(difficulty.toLowerCase()) {
                        case 'easy': user.easySolved++; break;
                        case 'medium': user.mediumSolved++; break;
                        case 'hard': user.hardSolved++; break;
                    }
                }
                user.attemptedProblemIds = user.attemptedProblemIds.filter(id => id !== problemId);
            } else if (status === 'attempted') {
                if (!user.solvedProblemIds.includes(problemId) && !user.attemptedProblemIds.includes(problemId)) {
                    user.attemptedProblemIds.push(problemId);
                }
            }
            await user.save();
            return user;
        } catch (error) {
            console.error('Error updating problem status:', error);
            return null;
        }
    },

    // Get user's progress
    getUserProgress: async function(userId) {
        try {
            const user = await User.findOne({ userId });
            if (!user) return null;

            return {
                name: user.name,
                totalProblemsSolved: user.totalProblemsSolved,
                easySolved: user.easySolved,
                mediumSolved: user.mediumSolved,
                hardSolved: user.hardSolved,
                solvedProblemIds: user.solvedProblemIds,
                attemptedProblemIds: user.attemptedProblemIds
            };
        } catch (error) {
            console.error('Error getting user progress:', error);
            return null;
        }
    },

    // Check if user has solved a specific problem
    hasSolvedProblem: async function(userId, problemId) {
        try {
            const user = await User.findOne({ userId });
            if (!user) return false;
            return user.solvedProblemIds.includes(problemId);
        } catch (error) {
            console.error('Error checking solved problem:', error);
            return false;
        }
    },

    // Get all users (for admin purposes)
    getAllUsers: async function() {
        try {
            return await User.find({});
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }
};

module.exports = userDetails;
