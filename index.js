require('dotenv').config();
const express = require('express');
const axios = require('axios');
const qs = require('qs');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());  // Allow cross-origin requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const PORT = 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const TOKEN_URI = process.env.TOKEN_URI;

app.get('/', (req, res) => {
    res.send('Welcome to Fitbit OAuth Project!');
});

// Step 1: Redirect user to Fitbit login
app.get('/auth', (req, res) => {
    const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=nutrition&expires_in=604800`;
    res.redirect(authUrl);
});

// Step 2: Handle Fitbit callback and exchange the code for tokens
app.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code missing.');
    }

    try {
        const response = await axios.post(
            TOKEN_URI,
            qs.stringify({
                client_id: CLIENT_ID,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
                code,
            }),
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token, refresh_token } = response.data;
        // Store the tokens securely in a session or database
        res.send({ access_token, refresh_token });
    } catch (error) {
        console.error('Error exchanging code for tokens:', error.response?.data || error.message);
        res.status(500).send('Error exchanging code for tokens.');
    }
});

// Route to fetch user's profile using access token
app.get('/user/profile', async (req, res) => {
    const { access_token } = req.query;

    if (!access_token) {
        return res.status(400).send('Access token is required.');
    }

    try {
        const response = await axios.get('https://api.fitbit.com/1/user/-/profile.json', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching profile:', error.response?.data || error.message);
        res.status(500).send('Error fetching profile data');
    }
});

// Step 3: Handle token refresh
app.post('/refresh_token', async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).send('Refresh token is required.');
    }

    try {
        const response = await axios.post(
            TOKEN_URI,
            qs.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token, refresh_token: new_refresh_token } = response.data;
        // Store the new tokens securely
        res.send({ access_token, refresh_token: new_refresh_token });
    } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        res.status(500).send('Error refreshing token.');
    }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
