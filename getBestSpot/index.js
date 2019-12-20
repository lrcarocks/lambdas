'use strict'
const fetch = require("node-fetch");
const aws = require('aws-sdk');
const client = require('data-api-client')({
    secretArn: process.env.AWS_SECRET_STORE_ARN,
    resourceArn: process.env.DB_CLUSTER_ARN,
    database: process.env.DB_NAME
});

const lambda = new aws.Lambda({
    apiVersion: '2017-02-28',
    region: 'us-east-1'
});

function sendAlert(userId, username, ALat, ALong, DLat, DLong, cb) {
    const notification = {
        title: 'Your Spot Was Selected.',
        body: `Yous spot was picked by ${username}`,
        userId: userId,
        arriverCoords: {lat: ALat, long: ALong},
        destCoords: {lat: DLat, DLong}
    };
    const event = {userId: [userId], notification: JSON.stringify(notification), data: JSON.stringify(notification)};
    console.log('event', event);
    lambda.invoke({
        InvocationType: 'RequestResponse',
        FunctionName: 'arn:aws:lambda:us-east-1:406941641630:function:fcm',
        Payload: JSON.stringify(event) // pass params
    }, cb);
}

module.exports.handler = async event => {
    console.log(JSON.stringify(event));
    let providerId = event.providerId;
    console.log("ProviderId:", providerId);

    const query = 'SELECT t.UserID, t.EntryTime, t.ExitTime, t.IsConfirmed, p.ID, p.ProviderID, p.WingCode, p.Latitude, p.Longitude, t.ID as tId ' +
        'FROM ParkingSpotDetails p, ParkingTransactionDetails t ' +
        'WHERE p.ProviderID IN (:providerId) AND t.ParkingSpotID=p.ID AND t.TrasactionCompleted=false';
    let response = await client.query(query, {providerId: providerId, tStatus: false});
    const origins = event.lat + ',' + event.long;
    let destinations = null;
    const destLatLong = [];
    if (response.records.length > 0) {
        response.records.forEach(r => {
            destLatLong.push({
                lat: r.Latitude,
                long: r.Longitude,
                tSpotId: r.ID,
                userId: r.UserID,
                wingCode: r.WingCode,
                tId: r.tId
            });
            if (destinations) {
                destinations += '|' + r.Latitude + ',' + r.Longitude;
            } else {
                destinations = r.Latitude + ',' + r.Longitude;
            }
        });
        const url = 'https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=' + origins + '&destinations=' + destinations + '&key=AIzaSyAeUOvz7ZQO7BI0nP7czlVWnLS-L3h7sA0'
        console.log(url);
        const res = await fetch(url);
        const data = await res.json();
        console.log(JSON.stringify(data));
        if (data && data.status === 'OK') {
            if (data.rows.length > 0) {
                const routeData = data.rows[0].elements;
                console.log('Route Data', JSON.stringify(routeData));
                if (routeData.length > 0) {
                    const rDists = routeData.map(r => {
                        if (r && r.distance) {
                            return r.distance.value;
                        }
                    });
                    console.log('array dist:', rDists);
                    const minDistance = Math.min(...rDists);
                    console.log('min dis:', minDistance);
                    const index = rDists.findIndex(v => v === minDistance);
                    console.log('min dis index:', index);
                    const LatLong = destLatLong[index];
                    console.log('min latlong:', JSON.stringify(LatLong));
                    console.log('address details:', JSON.stringify(rDists[index]));
                    const destLL = LatLong.lat + ',' + LatLong.long;
                    const directionsUrl = 'https://maps.googleapis.com/maps/api/directions/json?origin=' + origins + '&destination=' + destLL + '&key=AIzaSyAeUOvz7ZQO7BI0nP7czlVWnLS-L3h7sA0';
                    const directionRes = await fetch(directionsUrl);
                    const directionsData = await directionRes.json();
                    const resp = {
                        lat: LatLong.lat,
                        long: LatLong.long,
                        orgAddr: data.origin_addresses[0],
                        destAddr: data.destination_addresses[index],
                        providerId: providerId,
                        transId: LatLong.tId,
                        userId: LatLong.userId,
                        spotId: LatLong.tSpotId,
                        wingCode: LatLong.wingCode,
                        route: directionsData
                    };
                    console.log('final resp:', JSON.stringify(resp));
                    sendAlert(LatLong.userId, 'Arriver', event.lat, event.long, LatLong.lat, LatLong.long, function (error, data) {
                        console.log('invoke:', error, data);
                    });
                    return resp;
                } else {
                    console.log('invalid destination address');
                    throw new Error('Invalid destination address');
                }
            } else {
                console.log('invalid origin latlong');
                throw new Error('Invalid origin LatLong');
            }
        } else {
            console.log('error cannot cal distance');
            throw new Error('Cannot calculate distance');
        }
    } else {
        return null;
    }

};
