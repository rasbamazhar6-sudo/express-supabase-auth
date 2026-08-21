require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const PORT = process.env.PORT || 3000;

// ==========================================
// STAGE 1: AUTHENTICATION ROUTES
// ==========================================

// 1. POST /auth/signup
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Call Supabase SignUp
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({
    message: 'User created successfully',
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
});

// 2. POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Call Supabase SignIn
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  return res.status(200).json({
    message: 'Login successful',
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});
// ==========================================
// STAGE 2: PUBLIC & PROTECTED ROUTES
// ==========================================

// Security Guard Middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  // Extract the token string
  const token = authHeader.split(' ')[1];

  // Ask Supabase to verify the token
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // Attach the user data to the request so the route can use it
  req.user = data.user;
  next();
};

// 1. GET /public/info (Open to the world)
app.get('/public/info', (req, res) => {
  return res.status(200).json({
    message: 'This is public information. Anyone can see this!',
    timestamp: new Date().toISOString()
  });
});

// 2. GET /protected/profile (Locked behind verifyToken)
app.get('/protected/profile', verifyToken, (req, res) => {
  return res.status(200).json({
    message: 'Welcome to your private profile!',
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} and connected to Supabase`);
});