'use strict'

const client = require('data-api-client')({
    secretArn: process.env.AWS_SECRET_STORE_ARN,
    resourceArn: process.env.DB_CLUSTER_ARN,
    database: process.env.DB_NAME
});

const https = require('https');
const {google} = require('googleapis');
const sKeys = require("./touchpark_key");
const HOST = 'fcm.googleapis.com';
const PATH = '/v1/projects/' + sKeys.project_id + '/messages:send';
const MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const SCOPES = [MESSAGING_SCOPE];

function getAccessToken() {
    return new Promise(function (resolve, reject) {
        let jwtClient = new google.auth.JWT(
            sKeys.client_email,
            null,
            sKeys.private_key,
            SCOPES,
            null
        );
        jwtClient.authorize(function (err, tokens) {
            if (err) {
                reject(err);
                return;
            }
            resolve(tokens.access_token);
        });
    });
}

function sendFcmMessage(fcmMessage) {
    getAccessToken().then(function (accessToken) {
        var options = {
            hostname: HOST,
            path: PATH,
            method: 'POST',
            // [START use_access_token]
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
            // [END use_access_token]
        };

        var request = https.request(options, function (resp) {
            resp.setEncoding('utf8');
            resp.on('data', function (data) {
                console.log('Message sent to Firebase for delivery, response:');
                console.log(data);
            });
        });

        request.on('error', function (err) {
            console.log('Unable to send message to Firebase');
            console.log(err);
        });

        request.write(JSON.stringify(fcmMessage));
        request.end();
    });
}

function MsgTemplate(alert, body, token) {
    return {
        "message": {
            "token": token,
            "notification": {
                ...alert
            },
            "data": {
                ...body
            },
            "android": {
                "notification": {
                    "body": body
                }
            },
            "apns": {
                "headers": {
                    ...body
                },
                "payload": {
                    "aps": {
                        "category": "NEW_MESSAGE_CATEGORY"
                    }
                }
            }
        }
    };
}

module.exports.handler = async event => {
    const {alert, body, userId} = event;

    console.log(JSON.stringify(event));

    const data = await client.query('SELECT FcmToken FROM UserDetails WHERE ID IN (:userId)', {userId: userId.toString()});
    console.log(JSON.stringify(data));
    if (data.records.length > 0) {
        let tokens = null;
        data.records.forEach(t => {
            if (tokens) {
                tokens += ',' + t;
            } else {
                tokens = t;
            }
        });

        console.log('tokens', tokens);

        if (tokens) {
            sendFcmMessage(MsgTemplate(alert, body, tokens));
        }

        return true;
    } else {
        return false;
    }
};