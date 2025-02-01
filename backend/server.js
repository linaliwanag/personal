require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const querystring = require('querystring');

const app = express();
app.use(cors());

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

let accessToken = null;
let refreshToken = null;

/**
 * Step 1: Redirect user to Spotify authorization page
 */
app.get('/login', (req, res) => {
  const scope = "streaming user-read-playback-state user-modify-playback-state";
  const authUrl = `https://accounts.spotify.com/authorize?${querystring.stringify({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope
  })}`;
  res.redirect(authUrl);
});

/**
 * Step 2: Handle callback from Spotify and retrieve tokens
 */
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  const authOptions = {
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: querystring.stringify({
      code,
      redirect_uri: REDIRECT_URI, // Make sure this matches Spotify Developer Settings
      grant_type: 'authorization_code'
    })
  };

  try {
    const response = await axios(authOptions);
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;

    res.redirect(`http://localhost:3000?access_token=${accessToken}`);
  } catch (error) {
    console.error('Error retrieving access token:', error.response ? error.response.data : error.message);
    res.status(500).send('Authentication failed');
  }
});


/**
 * Step 3: Refresh the Spotify access token
 */
app.get('/refresh_token', async (req, res) => {
  if (!refreshToken) {
    return res.status(400).json({ error: "No refresh token available" });
  }

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }), {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken = response.data.access_token;
    res.json({ access_token: accessToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * Start Express server
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
