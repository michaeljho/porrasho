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
            reprompt: {
                outputSpeech: {
                    type: 'PlainText',
                    text: `I didn't get that. Please try again.`
                }
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
            res.send(getPlainTextAlexaResponse(`hello, ${currName}! i am excited to learn more about you. can you please tell me when you were born?`, false));
        } else if (type === 'IntentRequest' && intentName === 'WhoIsTallest') {
            let tallest = null;
            let max = 0;
            Object.keys(studentMap).forEach((key) => {
                const student = studentMap[key];
                if (student.height > max) {
                    max = student.height;
                    tallest = student.name;
                }
            });
            res.send(getPlainTextAlexaResponse(`the tallest student is ${tallest}, at ${max} inches tall.`, true))
        } else if (type === 'IntentRequest' && intentName === 'WhoIsShortest') {
            let shortest = null;
            let min = 1000;
            Object.keys(studentMap).forEach((key) => {
                const student = studentMap[key];
                if (student.height < min) {
                    min = student.height;
                    shortest = student.name;
                }
            });
            res.send(getPlainTextAlexaResponse(`the shortest student is ${shortest}, at ${min} inches tall.`, true))
        } else if (type === 'IntentRequest' && intentName === 'WhoIsOldest') {
            let oldest = null;
            let max = '9999-99-99';
            const now = new Date().getTime();
            Object.keys(studentMap).forEach((key) => {
                const student = studentMap[key];
                if (student.bday < max) {
                    max = student.bday;
                    oldest = student.name;
                }
            });
            res.send(getPlainTextAlexaResponse(`the oldest student is ${oldest}, at ${Math.floor((now - new Date(max).getTime()) / (1000 * 60 * 60 * 24 * 365))} years old.`, true))
        } else if (type === 'IntentRequest' && intentName === 'WhoIsYoungest') {
            let youngest = null;
            let min = '0000-00-00';
            const now = new Date().getTime();
            Object.keys(studentMap).forEach((key) => {
                const student = studentMap[key];
                if (student.bday > min) {
                    min = student.bday;
                    youngest = student.name;
                }
            });
            res.send(getPlainTextAlexaResponse(`the youngest student is ${youngest}, at ${Math.floor((now - new Date(min).getTime()) / (1000 * 60 * 60 * 24 * 365))} years old.`, true))
        } else if (type === 'IntentRequest' && intentName === 'LineThemUp') {
            let sorted = [];
            if (slots.Type.value === 'age') {
                Object.keys(studentMap).forEach((key) => {
                    const student = studentMap[key];
                    if (!sorted.length) {
                        sorted.push(student);
                    } else {
                        let inserted = false;
                        for (let x = 0, xlen = sorted.length; x < xlen; x++) {
                            if (student.age > sorted[x].age) {
                                sorted.splice(x, 0, student);
                                inserted = true;
                                break;
                            }
                        }
                        if (!inserted) sorted.push(student);
                    }
                });
                let names = ``;
                sorted.forEach((student, index) => {
                    if (index === 0) {
                        names += `first is ${student.name}. `;
                    } else {
                        names += `next is ${student.name}. `;
                    }
                });
                res.send(getPlainTextAlexaResponse(`ok class. let's get in line. ${names}`, true))
            } else if (slots.Type.value === 'height') {

            }
            res.send(getPlainTextAlexaResponse(`the youngest student is ${youngest}, at ${Math.floor((now - new Date(min).getTime()) / (1000 * 60 * 60 * 24 * 365))} years old.`, true))
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
        } else if (type === 'SessionEndedRequest') {
            res.send({ version: '1.0' });
        }
    }
});

app.use(express.static('site'));