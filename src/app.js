var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');
var kyccWebhookRouter = require('./routes/kycc-webhook');

var app = express();

app.use(logger('dev'));
app.use(express.json());

app.get('/healthz', (req, res) => res.json({status: 'ok'}));

app.use('/kycc-webhook', kyccWebhookRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	res.status(err.status || 500).json(err);
});

module.exports = app;
