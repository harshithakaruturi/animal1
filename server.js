const express = require('express');
const bodyParser = require('body-parser');
const { admin, db } = require('./firebase');
const path = require('path');
const passwordHash = require('password-hash');
const request = require('request');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('login');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userRef = db.collection('users').doc(email);
        const doc = await userRef.get();
        if (!doc.exists) {
            return res.send('No such user. Please Signup!');
        }
        const userData = doc.data();
        if (!passwordHash.verify(password, userData.password)) {
            return res.send('Incorrect password. Please try again.');
        }
        res.render('welcome', { username: userData.userName, animal: null, error: null });
    } catch (error) {
        res.send('Error logging in');
    }
});

app.post('/signupSubmit', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const usersData = await db.collection('users')
            .where('email', '==', email)
            .get();

        if (!usersData.empty) {
            return res.send('This account already exists.');
        }

        await db.collection('users').doc(email).set({
            userName: username,
            email: email,
            password: passwordHash.generate(password)
        });

        res.render('login', { message: 'Signup successful! Please log in.' });
    } catch (error) {
        res.send('Something went wrong.');
    }
});

app.post('/getAnimal', (req, res) => {
    const { animal, username } = req.body; 

    request.get({
        url: `https://api.api-ninjas.com/v1/animals?name=${encodeURIComponent(animal)}`,
        headers: {
            'X-Api-Key': 'l4eaoiHBZHClB2QSKa3Taw==MtPh11YAAwkJbOVL' 
        },
        json: true
    }, function (error, response, body) {
        if (error) {
            return res.render('welcome', { username, error: 'Request failed: ' + error, animal: null });
        } else if (response.statusCode !== 200) {
            return res.render('welcome', { username, error: 'Error: ' + response.statusCode, animal: null });
        } else {
            try {
                const obj = body[0];
                if (obj) {
                    return res.render('welcome', {
                        username,
                        animal: obj,
                        error: null
                    });
                } else {
                    return res.render('welcome', { username, error: 'No data found', animal: null });
                }
            } catch (parseError) {
                return res.render('welcome', { username, error: 'Error parsing JSON response: ' + parseError.message, animal: null });
            }
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
