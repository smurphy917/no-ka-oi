// const nodemailer = require('nodemailer');
import nodemailer from 'nodemailer';

const mailer = nodemailer.createTransport({
    port: 465,
    secure: true,
    host: 'smtp.gmail.com',
    auth: {
        user: 'nokaoi.app@gmail.com',
        pass: 'ik%afunJwKc&8y@Uu8W58L9mi#Ea'
    }
});
mailer.sendMail({
    to: 'smurphy917@gmail.com',
    from: 'no ka oi <nokaoi.app@gmail.com>',
    html: '<p>Hello!</p>',
    subject: 'TEST'
});