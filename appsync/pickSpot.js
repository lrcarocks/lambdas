'use strict'
const fetch = require("node-fetch");
// const client = require('data-api-client')({
//     secretArn: process.env.AWS_SECRET_STORE_ARN,
//     resourceArn: process.env.DB_CLUSTER_ARN,
//     database: process.env.DB_NAME
// });

module.exports.handler = async event => {
    console.log(JSON.stringify(event));
    const {lat, long, providerId, dLat, dLong} = event;

    const origins = lat + ',' + long;
    const destinations = dLat + ',' + dLong;
    const directionsUrl = 'https://maps.googleapis.com/maps/api/directions/json?origin=' + origins + '&destination=' + destinations + '&key=AIzaSyAeUOvz7ZQO7BI0nP7czlVWnLS-L3h7sA0';
    const directionRes = await fetch(directionsUrl);
    const directionsData = await directionRes.json();
    const resp = {
        ...event,
        route: directionsData
    };
    console.log('final resp:', JSON.stringify(resp));
    // sendAlert(LatLong.userId, 'Arriver', event.lat, event.long, LatLong.lat, LatLong.long, function (error, data) {
    //     console.log('invoke:', error, data);
    // });
    return resp;

};
