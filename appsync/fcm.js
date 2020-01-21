'use strict'

const client = require('data-api-client')({
    secretArn: process.env.AWS_SECRET_STORE_ARN,
    resourceArn: process.env.DB_CLUSTER_ARN,
    database: process.env.DB_NAME
});
const axios = require('axios');

const fcmUrl = 'https://fcm.googleapis.com/fcm/send';
const serverKey = 'key=AAAAnowspjQ:APA91bGE0aPE7AUavRMIJFUApOji1JqRN91zqcL5bnWa5qPg5LpjPyL70sqi8PImu5GUg8G9sz_9SssvzGYAxuzVmh_Q725WI1udeXXd_OKM7X6lVxSqlV4JjSYdaCAOLkOYtGbiWoTX';


async function sendFcmMessage(fcmMessage) {
    console.log('message', JSON.stringify(fcmMessage));
    var options = {
        // [START use_access_token]
        headers: {
            'Content-Type': 'application/json',
            'Authorization': serverKey
        }
    };

    const response = await axios.post(fcmUrl, fcmMessage, options);
    const data = response.data;
    console.log('axios', data);
    return data;
}

function MsgTemplate(notification, data, token) {
    console.log(notification, data);
    return {
        "to": token,
        "collapse_key": "type_a",
        "notification": notification,
        "data": data
    };
}

module.exports.handler = async event => {
    const {notification, data, userId} = event;

    console.log(JSON.stringify(event));

    console.log(userId.toString());
    const fcmTokens = await client.query('SELECT FcmToken FROM UserDetails WHERE ID IN (:userId)', {userId: userId.toString()});
    console.log(JSON.stringify(data));
    if (fcmTokens.records.length > 0) {
        let tokens = null;
        fcmTokens.records.forEach(t => {
            if (tokens) {
                tokens += ',' + t.FcmToken;
            } else {
                tokens = t.FcmToken;
            }
        });

        console.log('tokens', tokens);

        if (tokens) {
            await sendFcmMessage(MsgTemplate(JSON.parse(notification), JSON.parse(data), tokens));
        }

        return true;
    } else {
        return false;
    }
};