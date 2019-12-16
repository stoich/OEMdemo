Tray.io Embedded Edition sample application
=================

## Table of Contents

  * [Intro](#trayio-embedded-edition-sample-application)
  * [Important concepts in Tray.io Embedded Edition](#important-concepts-in-trayio-embedded-edition)
  * [Setting up and running](#setting-up-and-running-the-sample-application)

## Intro
In this repo is a sample webapp which runs on top of the Tray.io Embedded Edition API - this is an application which simply allows you to create new external users linked to your Tray.io partner account, and allow them to create and configure copies of your Solutions that exist on your Tray.io partner account.

## Important concepts in Tray.io Embedded Edition

There are a few key things we should define to understand how to integrate Embedded Edition.

#### System components:

##### Your Partner Account
This is the Tray.io account we will provide for the purposes of setting up your integration to Tray.io. You will have to create any Solutions that you would like your users to use on this account. When you sign up an external user to Tray.io through your system, they will be considered to be a user linked to this account's team.

##### Your Partner Accounts Workflows

Workflows allow you to build automation within Tray by linking a series of steps. Each step will have a connector that can authenticate and run API calls against a certain service, or transform some data existing from previous steps in the workflow.

##### Your Partner Accounts Projects

Projects allow you to package one or more workflows together, in order to be able to provide a solution in your application.

##### Your Partner Accounts Solutions

Your Solutions will be available to list and edit through the Tray.io GraphQL API for usage in your application. These are built from Projects, and will be what your External Users configure to get a version of your Project that is linked to their own API Authentications and custom configuration values for the workflows used.

##### Your Partner Accounts External Users

In order for your users to take advantage of the Tray.io platform, they must have a Tray account. We have set up a system to provision Tray.io accounts which will be linked to the team of your Partner user.

##### Your External Users Solution Instances

When an external user configures a Solution, a copy of that Solution will be created in that accounts Solution instance list. Their Solution Instance must then be configured and enabled with your users application Authentications for the services used within that Solution.

#### Integration details:

* [Embedded Edition GraphQL API](https://tray.io/docs/article/partner-api-intro)
* [Using the Tray.io configurator and authentication UIs from within your application](https://tray.io/docs/article/embedded-external-configuration)
* [Authenticating your external users](https://github.com/trayio/embedded-edition-sample-app#authenticating-your-external-users)

## Setting up and running the sample application

To set up and run the sample application first you must have Node LTS v10 and then install the packages:

```
npm install
```

In order to setup your environment variables and run the application, you then have to run `./setup.sh`

```
TRAY_ENDPOINT=prod
TRAY_MASTER_TOKEN=<your partner token>
TRAY_PARTNER=<your partner name (used to enable custom stylesheets in the Tray.io configurator)>
```

The script will have the following defaults and then run the required node processes (npm scripts api and start):

```
TRAY_ENDPOINT=prod
TRAY_PARTNER=asana
TRAY_MASTER_TOKEN=<When you successfully run the script, it will store your token in .token and read a default value from there>
```

## Implementation details

#### Making queries and executing mutations on the GQL API
You can see the query + mutation definitions in the file `server/graphql.js`. For example the Solutions listing query for a partner account is defined as the code below:
```
    listSolutions: () => {
        const query = gql`
            {
                viewer {
                    solutions {
                        edges {
                            node {
                                id
                                title
                            }
                        }
                    }
                }
            }
        `;

        return masterClient.query({query});
    }
```

This query fetches all Solutions for the given master token and provides the id and title fields. In order to make this query you must pass your Tray.io Partner Accounts API master token, we have some middleware which is using the Apollo Relay client imported from the `server/gqlclient.js`.

To create side effects through the GraphQL API you must run a mutation. For example to create a Solution Instance from a Solution for a given external user, the mutation is defined as the code below:

```
    createSolutionInstance: (userToken, solutionId, name) => {
        const mutation = gql`
            mutation {
                createSolutionInstance(
                    input: {
                        solutionId: "${solutionId}",
                        instanceName: "${name}",
                    }
                ) {
                    solutionInstance {
                        id
                    }
                }
            }
        `;

        return generateClient(userToken).mutate({mutation});
    },
```

This code runs the createSolutionInstance mutation with the `solutionId` template variable passed in to determine which Solution to copy over to the External User account. It's run using a client that is generated from the user token, which is the user that will receive the new Solution Instance.

#### Authenticating your external users

In order to run user mutations or queries you will have to generate a user access token, so before running the mutation above you would have to run the `authorize` mutation with the required users trayId:

```
    authorize: trayId => {
        const mutation = gql`
            mutation {
                authorize(input: {userId: "${trayId}"}) {
                    accessToken
                }
            }
        `;

        return masterClient.mutate({mutation});
    },
```
