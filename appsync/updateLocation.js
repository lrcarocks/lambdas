'use strict'

module.exports.handler = async event => {

    const {lat, long, destLat, destLong} = event.input;

    const origins = lat + ',' + long;
    const destLL = destLat + ',' + destLong;

    const directionsUrl = 'https://maps.googleapis.com/maps/api/directions/json?origin=' + origins + '&destination=' + destLL + '&key=AIzaSyAeUOvz7ZQO7BI0nP7czlVWnLS-L3h7sA0';
    const directionRes = await fetch(directionsUrl);
    const directionsData = await directionRes.json();

    return {...event.input,  route: directionsData};
};
