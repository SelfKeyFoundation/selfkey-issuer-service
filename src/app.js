require('./sentry');
var createError = require('http-errors');
var Sentry = require('@sentry/node');
var express = require('express');
var config = require('./config');
var logger = require('morgan');
var SelfkeyAgent = require('@selfkey/agent').default;
var Entities = require('@selfkey/agent/lib/entities').default;
var {createConnection} = require('typeorm');
var kyccWebhookRouter = require('./routes/kycc-webhook');

var app = express();
app.use((req, res, next) => {
	const dbConnection = createConnection({
		type: 'sqlite',
		database: config.dbName,
		synchronize: true,
		logging: ['error', 'info', 'warn'],
		entities: Entities
	});

	req.selfkeyAgent = new SelfkeyAgent({
		dbConnection,
		infuraId: config.infuraProjectId,
		kmsKey: config.kmsKey,
		agentName: config.agentName,
		didProvider: 'did:web'
	});

	next();
});
app.use(Sentry.Handlers.requestHandler());
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
