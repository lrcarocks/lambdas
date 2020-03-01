'use strict'

const client = require('data-api-client')({
    secretArn: process.env.AWS_SECRET_STORE_ARN,
    resourceArn: process.env.DB_CLUSTER_ARN,
    database: process.env.DB_NAME
});

const SECERT_KEY = "sk_test_PkuVCtuwhPb99IN1XFaxCBrm00BLaemmP4";

const stripe = require('stripe')(SECERT_KEY);

module.exports.handler = async event => {
    const {amount, cardNo, cvv, expMonth, expYear, zipCode} = event.arguments;
    //1. create payment method
    const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
            number: cardNo,
            exp_month: expMonth,
            exp_year: expYear,
            cvc: cvv
        }
    });
    console.log("PAY-METHOD", paymentMethod);
    const payId = paymentMethod.id;

    //2. create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'],
        payment_method: payId
    });
    console.log("PAY-INTENT", paymentIntent);

    // const confirmPayment = await stripe.paymentIntents.confirm(paymentIntent.id);
    // console.log("PAY-CONFIRM", confirmPayment);

    const retrieve = await stripe.paymentIntents.retrieve(paymentIntent.id);
    console.log("PAY-RETRIEVE", retrieve);

    //3. capture payment using payment intent
    const paymentCapture = await stripe.paymentIntents.capture(paymentIntent.id);
    console.log("PAY-CAPTURE", paymentCapture);

    // Send publishable key and PaymentIntent details to client
    const result = {
        transId: paymentCapture.id,
        status: paymentCapture.status,
        amount: paymentCapture.amount
    };

    return result;
};
