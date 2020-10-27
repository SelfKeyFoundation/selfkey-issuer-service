var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');
var kyccWebhookRouter = require('./routes/kycc-webhook');

var app = express();

app.use(logger('dev'));
app.use(express.json());

app.use('/kycc-webhook', kyccWebhookRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	res.status(err.status || 500).json(err);
});

module.exports = app;
