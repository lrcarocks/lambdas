'use strict'

const client = require('data-api-client')({
    secretArn: process.env.AWS_SECRET_STORE_ARN,
    resourceArn: process.env.DB_CLUSTER_ARN,
    database: process.env.DB_NAME
});

const SECERT_KEY = "sk_test_PkuVCtuwhPb99IN1XFaxCBrm00BLaemmP4";

const stripe = require('stripe')(SECERT_KEY);

module.exports.handler = async event => {
    const {amount} = event.arguments;
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'],
    });

    // Send publishable key and PaymentIntent details to client
    const result = {
        key: process.env.STRIPE_PUBLISHABLE_KEY,
        secret: paymentIntent.client_secret
    };

    return result;
};
