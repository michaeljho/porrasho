const express = require('express');
const logger = require('morgan');
const favicon = require('serve-favicon');
const compression = require('compression');
const sass = require('node-sass-middleware');
const path = require('path');

const app = express();
const server = app.listen(30000, '0.0.0.0');

app.disable('x-powered-by');
//app.use(favicon(__dirname + 'site/images/favicon.ico'));
app.use(compression());

app.use('/styles', sass({
    src: path.join(__dirname, 'site/scss'),
    dest: path.join(__dirname, 'site/styles'),
    debug: true,
    outputStyle: 'expanded'
}));

app.use(express.static('site'));