'use strict'

const client = require('data-api-client')({
    secretArn: process.env.AWS_SECRET_STORE_ARN,
    resourceArn: process.env.DB_CLUSTER_ARN,
    database: process.env.DB_NAME
});

module.exports.handler = async event => {
    console.log(JSON.stringify(event));
    let providerId = null;
    //Convert providerId array to comma seperated string
    event.providerId.forEach(v => {
        if (providerId) {
            providerId += ',' + parseInt(v);
        } else {
            providerId = parseInt(v);
        }
    });
    // const providerId = event.providerId.map(v => v); //ProviderId
    const tStatus = false;//transactions Status
    console.log("ProviderId:", providerId);

    try {
        const query = 'SELECT t.UserID, t.EntryTime, t.ExitTime, t.IsConfirmed, p.ID, p.ProviderID, p.WingCode, p.Latitude, p.Longitude, u.PhoneNumber ' +
            'FROM ParkingSpotDetails p, ParkingTransactionDetails t, UserDetails u ' +
            'WHERE p.ProviderID IN (:providerId) AND u.ID=t.UserID AND t.ParkingSpotID=p.ID AND t.TrasactionCompleted=false';
        let response = await client.query(query, {providerId: providerId, tStatus});
        console.log(response.records);
        return response.records;
    } catch (e) {
        console.log(e);
        throw e;
    }
};
