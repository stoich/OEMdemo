import { log } from './logging';

import { attemptLogin, generateUserAccessToken } from './domain/login';

import { checkUserExists, generateNewUser, validateRequest } from './domain/registration';

module.exports = function (app) {

    app.use(require('express-session')({
        secret: '2C44-4D44-WppQ38S',
        resave: true,
        saveUninitialized: true
    }));

    /*
    * /api/login:
    * Attempt to retrieve user from DB, if not found respond with 401 status.
    * Otherwise attempt to generate a tray access token and set user info onto
    * session.
    */
    app.post('/api/login', function (req, res) {
        const user = attemptLogin(req);

        if (user && (!user.uuid || !user.trayId)) {
            res.status(500).send({
                error: `Unable to login. User "${user.username}" found locally is missing one or more of following required fields: uuid, trayId`
            });
        } else if (user) {
            log({
                message: 'Logged in with:',
                object: user
            });

            // Attempt to generate the external user token and save to session:
            generateUserAccessToken(req, res, user)
                .then(_ => res.sendStatus(200))
                .catch(err => {
                    log({message: 'Failed to generate user access token:', object: err});
                    res.status(500).send(err);
                });
        } else {
            log({message: 'Login failed for user:', object: req.body});
            res.status(401).send({error: 'User not found. Keep in mind OEM Demo app stores new users in-memory and they are lost on server restart.'});
        }
    });

    /*
    * /api/register:
    * Check if user already exists, if so respond with 409 status.
    * Validate request body, if not valid respond with 400 status.
    * Otherwise attempt to generate a tray user and insert new user object into
    * the DB.
    */
    app.post('/api/register', function (req, res) {
        if (checkUserExists(req)) {
            log({message: 'Failed to create user, already exists:', object: req.body});
            return res.status(409).send(`User name ${req.body.username} already exists`);
        }

        const validation = validateRequest(req);

        if (!validation.valid) {
            const errorMsg = `The following params missing in user object, [${validation.errors.join(', ')}]`;
            log({message: errorMsg});
            return res.status(400).send(errorMsg);
        }

        generateNewUser(req)
            .then(user => {
                log({message: `successfully created user ${req.body.username}`, object: user});
                return res.status(200).send(user);
            })
            .catch(err => {
                log({message: 'There was an error creating the external Tray user:', object: err});
                res.status(500).send('There was an error creating the external Tray user:');
            });
    });

    /*
    * /api/logout:
    * Remove session data.
    */
    app.post('/api/logout', function (req, res) {
        req.session.destroy();
        res.sendStatus(200);
    });

    // Authenticate all endpoints except the auth endpoints defined in this module
    app.use(function (req, res, next) {
        if (req.session && req.session.admin) {
            return next();
        } else {
            return res.sendStatus(401);
        }
    });

}
