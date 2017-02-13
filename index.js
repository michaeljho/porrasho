const express = require('express');
const logger = require('morgan');
const favicon = require('serve-favicon');
const compression = require('compression');
const sass = require('node-sass-middleware');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
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

const app = express();
const server = app.listen(30000, '0.0.0.0');

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
        res.send(rsvp);
    });
});

app.post('/names', (req, res) => {
    console.log('received name vote', req.body);
    const name = new NameVote(req.body);
    name.save((err, name) => {
        if (err) return console.error(err);
        res.send(name);
    });
});

app.use('/styles', sass({
    src: path.join(__dirname, 'site/scss'),
    dest: path.join(__dirname, 'site/styles'),
    debug: true,
    outputStyle: 'expanded'
}));

app.use(express.static('site'));