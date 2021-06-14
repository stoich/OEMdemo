const express = require('express');
const app = express();

let bodyParser = require('body-parser');

// support json encoded bodies
app.use(bodyParser.json());
// support encoded bodies
app.use(bodyParser.urlencoded({extended: true}));

// Set CORS headers
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", ["localhost"]);
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Configure Express application:
app.use(require('morgan')('tiny'));

require('./configuration').setEnvironment();

// Authentication and Authorization Middleware:
require('./auth')(app);

// Setup API router:
require('./api')(app);

app.listen(process.env.PORT || 3001, () => {
    console.log(`Express started on port ${process.env.PORT || 3001} with Graphql endpoint ${process.env.TRAY_ENDPOINT}`);
});
