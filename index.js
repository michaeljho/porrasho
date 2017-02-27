const express = require('express');
const logger = require('morgan');
const favicon = require('serve-favicon');
const compression = require('compression');
const sass = require('node-sass-middleware');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const config = require('config');
mongoose.connect('mongodb://localhost:27017/porrasho');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('mongodb connected');
});

const showerRsvpSchema = mongoose.Schema({
    name: String,
    email: String,
    guest_count: Number
});
const ShowerRsvp = mongoose.model('ShowerRsvp', showerRsvpSchema);

const nameVoteSchema = mongoose.Schema({
    name: String,
    other_name: String
});
const NameVote = mongoose.model('NameVote', nameVoteSchema);

const gmail = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mike.cilla.ho@gmail.com',
        pass: config.get('gmailPassword')
    }
});

const mailTpl = {
    from: '"Mike and Priscilla" <mike.cilla.ho@gmail.com>',
    to: '',
    subject: '',
    text: '',
    html: ''
};

const app = express();
const server = app.listen(80, '0.0.0.0');

app.disable('x-powered-by');
app.use(favicon(__dirname + '/favicon.ico'));
app.use(compression());

app.use(bodyParser.urlencoded({
    extended: false,
    limit: '2mb'
}));

app.use(bodyParser.json({
    limit: '2mb'
}));

app.post('/rsvp', (req, res) => {
    console.log('received rsvp request', req.body);
    const rsvp = new ShowerRsvp(req.body);
    rsvp.save((err, rsvp) => {
        if (err) return console.error(err);

        gmail.sendMail(Object.assign({}, mailTpl, {
            to: rsvp.email,
            subject: 'Thank you for RSVPing to our baby shower!',
            text: 'We look forward to seeing you on March 18th! Keep an eye out for more details on our website or in future emails.\n-M&P | porrasho.com',
            html: `<div>Hi ${rsvp.name}!</div>
                <div style="margin-top:10px;">We look forward to seeing you on March 18th!</div>
                <div>Keep an eye out for more details on our website or in future emails.</div>
                <div style="margin-top:10px;">Mike & Priscilla<br/><a href="porrasho.com" target="_blank">porrasho.com</a></div>`
        }), (error, info) => {
            if (error) return console.log(error);
            console.log('RSVP email confirmation sent:', info.messageId, info.response);
        });

        gmail.sendMail(Object.assign({}, mailTpl, {
            to: 'mike.cilla.ho@gmail.com, parents@ferrenburg.com',
            subject: `Baby Shower RSVP: ${rsvp.name} - ${rsvp.guest_count} guest${rsvp.guest_count > 1 ? 's' : ''}`,
            text: `We look forward to seeing you on March 18th! Keep an eye out for more details on our website or in future emails.\n-M&P | porrasho.com`,
            html: `<div>RSVP received:</div>
                <div>${rsvp.name}</div>
                <div>${rsvp.email}</div>
                <div>Guests: ${rsvp.guest_count}</div>`
        }), (error, info) => {
            if (error) return console.log(error);
            console.log('RSVP email info sent:', info.messageId, info.response);
        });

        res.send(rsvp);
    });
});

app.post('/names', (req, res) => {
    console.log('received name vote', req.body);
    const name = new NameVote(req.body);
    name.save((err, name) => {
        if (err) return console.error(err);

        gmail.sendMail(Object.assign({}, mailTpl, {
            to: 'mike.cilla.ho@gmail.com',
            subject: `Baby name suggestion: ${name.name === 'other' ? name.other_name : name.name}`,
            text: `${name.name === 'other' ? name.other_name : name.name}`,
            html: `${name.name === 'other' ? name.other_name : name.name}`
        }), (error, info) => {
            if (error) return console.log(error);
            console.log('Baby name email info sent:', info.messageId, info.response);
        });

        res.send(name);
    });
});

app.use('/styles', sass({
    src: path.join(__dirname, 'site/scss'),
    dest: path.join(__dirname, 'site/styles'),
    debug: true,
    outputStyle: 'expanded'
}));

function getPlainTextAlexaResponse(text, endSession) {
    return {
        version: '1.0',
        response: {
            outputSpeech: {
                type: 'PlainText',
                text: text
            },
            shouldEndSession: endSession
        }
    }
}

let studentMap = {};
let currName;

app.post('/alexa', (req, res) => {
    const { request, session } = req.body;
    console.log('alexa request received', request);

    if (session.application.applicationId !== 'amzn1.ask.skill.f0e1b964-3237-43b7-99cb-737fddfc794e') {
        res.send(getPlainTextAlexaResponse(`I'm sorry, I don't recognize you.`, true));
    }

    if (session.new) {
        const { type, intent } = request;
        const { name: intentName, slots } = intent;
        if (type === 'LaunchRequest' || (type === 'IntentRequest' && intentName === 'HelloWorld')) {
            res.send(getPlainTextAlexaResponse('hello innovation academy! my name is alexa. are you ready to have some fun today?', true));
        } else if (type === 'IntentRequest' && intentName === 'LearnStudent' && slots.Name.value) {
            currName = slots.Name.value;
            studentMap[currName] = studentMap[currName] || { name: currName };
            res.send(getPlainTextAlexaResponse(`hello ${currName}! i am excited to learn more about you. can you please tell me when you were born?`, false));
        }
    } else {
        const { type, intent } = request;
        const { name: intentName, slots } = intent;
        if (type === 'IntentRequest' && intentName === 'LearnStudent') {
            if (slots.Birthday.value) {
                studentMap[currName].bday = slots.Birthday.value;
                const bday = new Date(slots.Birthday.value).getTime();
                const now = new Date().getTime();
                const diff = Math.floor((now - bday) / (1000 * 60 * 60 * 24 * 365));
                res.send(getPlainTextAlexaResponse(`wow, ${currName}, you are already ${diff} years old! how tall are you now?`, false));
            } else if (slots.Height.value) {
                const height = parseInt(slots.Height.value);
                studentMap[currName].height = height;
                if (height >= 54) {
                    res.send(getPlainTextAlexaResponse(`you sure are getting big. did you know that you are tall enough to ride all of the roller coasters at sea world?`, true));
                } else {
                    res.send(getPlainTextAlexaResponse(`you sure are getting big. did you know that you only have ${54 - height} more inches until you can ride all of the roller coasters at sea world?`, true));
                }
            }
        } else if (type === 'IntentRequest' && intentName === 'WhoIsTallest') {
            let tallest = null;
            let max = 0;
            Object.values(studentMap).forEach((student) => {
                console.log('who is tallest', student);
                if (student.height > max) {
                    max = student.height;
                    tallest = student.name;
                }
            });
            res.send(getPlainTextAlexaResponse(`the tallest student is ${tallest}, at ${max} inches tall.`, true))
        } else if (type === 'SessionEndedRequest') {
            res.send({ version: '1.0' });
        }
    }
});

app.use(express.static('site'));