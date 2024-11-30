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

app.get('/auth', (req, res) => {
    const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=nutrition&expires_in=604800`;
    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    const { code } = req.query;

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
        // Store the tokens securely
        res.send({ access_token, refresh_token });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error exchanging code for tokens.');
    }
});

// Route to fetch user's profile
app.get('/user/profile', async (req, res) => {
    // Replace this with how you actually retrieve the access token
    const access_token = req.query.access_token; // Or use your session/database method
    try {
        const response = await axios.get('https://api.fitbit.com/1/user/-/profile.json', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });
        res.json(response.data); // Sends the profile data to the client
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching profile data');
    }
});


// Route to refresh access token
app.post('/refresh_token', async (req, res) => {
    const access_token = req.query.access_token;
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
        console.error(error);
        res.status(500).send('Error refreshing token.');
    }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
