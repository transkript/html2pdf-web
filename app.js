const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerFile = require('./public/docs/swagger_output.json');
const swaggerUi = require("swagger-ui-express");

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const converterRouter = require('./routes/converter');

const app = express();

app.options('*', cors())
app.use(cors({
  allowedHeaders: [
      'Accept',
      'Content-Type',
      'Client-Secret-Id',
      'Authorization',
      'Access-Control-Request-Headers',
      'Access-Control-Request-Method',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Origin',
  ],
  origin: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(bodyParser.raw({type: 'multipart/form-data', limit : '50mb'}));
app.use(bodyParser.raw({type: 'text/plain', limit : '50mb'}));
app.use(bodyParser.raw({type: 'text/html', limit : '50mb'}));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/converter', converterRouter);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
