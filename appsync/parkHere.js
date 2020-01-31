'use strict'

const client = require('data-api-client')({
    secretArn: process.env.AWS_SECRET_STORE_ARN,
    resourceArn: process.env.DB_CLUSTER_ARN,
    database: process.env.DB_NAME
});

module.exports.handler = async event => {
    console.log(JSON.stringify(event));
    const {parkHere} = event;
    try {
        const {UserId, EntryTime, ExitTime} = parkHere;
        const query = 'INSERT INTO ParkingSpotDetails(Latitude, Longitude, ProviderID, WingCode, DisplayName) values (:Latitude, :Longitude, :ProviderID, :WingCode, :DisplayName)';
        const tQuery = 'INSERT INTO ParkingTransactionDetails(ParkingSpotID, UserId, EntryTime, ExitTime, TrasactionCompleted) values (:ParkingSpotID, :UserId, :EntryTime, :ExitTime, :TrasactionCompleted)';
        let insert = await client.query(query, {...parkHere});
        const insertId = insert.insertId;
        console.log('insertId', insertId);
        await client.query(tQuery, {
            ParkingSpotID: insertId,
            UserId: UserId,
            EntryTime: EntryTime,
            ExitTime: ExitTime,
            TrasactionCompleted: false
        });
        const rQry = 'SELECT t1.ParkingSpotID as ParkingSpotID , t2.ProviderID as ProviderID,t2.ID as ID,t1.UserId as UserId,t1.ID as TransHistoryID,t1.TrasactionCompleted as TrasactionCompleted,t1.IsConfirmed as IsConfirmed,t1.ArriverId as ArriverId ,t1.ArriverLat as ArriverLat,t1.ArriverLong as ArriverLong,t2.WingCode as WingCode,t2.Latitude as parkedLat,t2.Longitude as parkedLong FROM mysqlauroradb.ParkingTransactionDetails as t1 inner join mysqlauroradb.ParkingSpotDetails as t2 on t1.ParkingSpotID=t2.ID  WHERE t1.ParkingSpotID=:spotId  and (t1.TrasactionCompleted is NULL OR t1.TrasactionCompleted is false)  ORDER BY t1.ExitTime DESC limit 1';
        // console.log(rQry);
        let resp = await client.query(rQry, {spotId: insertId});
        console.log(JSON.stringify(resp));
        return resp.records.length > 0 ? resp.records[0] : null;
    } catch (e) {
        throw new Error(e);
    }
};



