var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const jwt = require("jsonwebtoken")
const fs = require('fs')

var indexRouter = require('./routes/api');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', indexRouter);

let privateKey = fs.readFileSync('./private.pem', 'utf8');
let token = jwt.sign({"pid": "001"}, privateKey, {algorithm: 'HS256'});
console.log(token);

module.exports = app;