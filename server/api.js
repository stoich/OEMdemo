import { mutations, queries } from './graphql';
import { get, map, values } from 'lodash';

// Get nodes for a given path from graphQL response:
function getNodesAt (results, path) {
    return map(
        values(get(results, path)),
        x => x.node,
    );
}

const solutionPath = `${process.env.TRAY_APP_URL}/external/solutions/${process.env.TRAY_PARTNER}`;
const editAuthPath = `${process.env.TRAY_APP_URL}/external/auth/edit/${process.env.TRAY_PARTNER}`;
const createAuthPath = `${process.env.TRAY_APP_URL}/external/auth/create/${process.env.TRAY_PARTNER}`;

module.exports = function (app) {

    // GET Account:
    app.get('/api/me', (req, res) => {
        queries.me(req.session.token)
        .then((results) => res.status(200).send(results.data.viewer.details))
        .catch(err => res.status(500).send(err));
    });

    // GET user auths:
    app.get('/api/auths', (req, res) => {

        queries.auths(req.session.token)
            .then((results) => {
                    res.status(200)
                        .send({
                            data: getNodesAt(results, 'data.viewer.authentications.edges')
                        })
                }
            )
            .catch(err => res.status(500).send(err));
    });

    // GET auth url:
    app.post('/api/auth', (req, res) => {
        mutations.getGrantTokenForUser(req.session.user.trayId)
            .then(({payload}) => {
                const authorizationCode = payload.data.generateAuthorizationCode.authorizationCode;
                res.status(200).send({
                    data: {
                        popupUrl: `${editAuthPath}/${req.body.authId}?code=${authorizationCode}`
                    }
                });
            })
            .catch(err => res.status(500).send(err));
    });

    // GET auth create url:
    app.post('/api/auth/create', (req, res) => {
        mutations.getGrantTokenForUser(req.session.user.trayId)
            .then(({payload}) => {
                const authorizationCode = payload.data.generateAuthorizationCode.authorizationCode;
                const popupUrl = req.body.solutionInstanceId && req.body.externalAuthId ?
                    `${createAuthPath}/${req.body.solutionInstanceId}/${req.body.externalAuthId}?code=${authorizationCode}` :
                    `${createAuthPath}?code=${authorizationCode}`;

                res.status(200).send({
                    data: {
                        popupUrl 
                    }
                });
            })
            .catch(err => res.status(500).send(err));
    });

    // GET Solutions:
    app.get('/api/solutions', (req, res) => {
        queries.solutions()
        .then((results) => {
            res.status(200).send({
                data: getNodesAt(results, 'data.viewer.solutions.edges')
            });
        })
        .catch(err => res.status(500).send(err));
    });

    // GET Solution Instances:
    app.get('/api/solutionInstances', (req, res) => {
        const externalUserToken = req.session.token;

        if (!externalUserToken) {
            res.status(500).send('Missing external user auth');
        }

        queries.solutionInstances(externalUserToken)
        .then(results => {
            res.status(200).send({
                data: getNodesAt(results, 'data.viewer.solutionInstances.edges'),
            });
        })
        .catch(err => res.status(500).send(err));
    });

    // POST Solution Instances
    app.post('/api/solutionInstances', (req, res) => {
        mutations.createSolutionInstance(
            req.session.token,
            req.body.id,
            req.body.name,
        )
        .then(solutionInstance => {
            return mutations.getGrantTokenForUser(
                req.session.user.trayId,
            ).then(({payload}) => {
                const solutionInstanceId = solutionInstance.data.createSolutionInstance.solutionInstance.id;
                const authorizationCode = payload.data.generateAuthorizationCode.authorizationCode;
                res.status(200).send({
                    data: {
                        popupUrl: `${solutionPath}/configure/${solutionInstanceId}?code=${authorizationCode}`
                    }
                });
            })
        })
        .catch(err => {
            res.status(500).send(err)
        });
    });

    // PATCH solution instance:
    app.patch('/api/solutionInstance/:solutionInstanceId', (req, res) => {
        mutations.updateSolutionInstance(
            req.session.token,
            req.params.solutionInstanceId,
            req.body.enabled
        )
        .then(() => res.sendStatus(200))
        .catch(err => res.status(500).send({err}));
    });


    // PATCH Solution Instance configuration:
    app.patch('/api/solutionInstance/:solutionInstanceId/config', (req, res) => {
        mutations.getGrantTokenForUser(
            req.session.user.trayId,
            req.params.solutionInstanceId,
        )
        .then(({payload}) => {
            const authorizationCode = payload.data.generateAuthorizationCode.authorizationCode;
            res.status(200).send({
                data: {
                    popupUrl: `${solutionPath}/configure/${req.params.solutionInstanceId}?code=${authorizationCode}`
                }
            });
        })
        .catch(err => res.status(500).send({err}));
    });

    // DELETE Solution Instance:
    app.delete('/api/solutionInstance/:solutionInstanceId', (req, res) => {
        mutations.deleteSolutionInstance(
            req.session.token,
            req.params.solutionInstanceId,
        )
        .then(() => res.sendStatus(200))
        .catch(err => res.status(500).send({err}));
    });

};
