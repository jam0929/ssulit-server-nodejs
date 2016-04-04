/*
 * APP.JS
 */

var config = require('./config/env').Config;

//load module
var express = require('express');
var connect = require('connect');
passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var server = express();
var oauth2 = require('./oauth2');
var login = require('connect-ensure-login');
var redis = require('redis');

var controllers = require('./controllers');

server.set('view engine', 'ejs');

//mysql
global.mysql = require('mysql');
global.mysqlConfig = require('./config/mysql.json');
global.lullu_mysqlConfig = require('./config/mysql_lullu.json');

//aws
global.aws = require('aws-sdk');
global.aws.config.loadFromPath('./config/aws.json');

//redis client
if (config.env === 'production') {
  global.redisClient = redis.createClient(6379, 'session.iewfre.0001.apne1.cache.amazonaws.com');
}

//global module
db = require('./db');
utils = require('./utils');

//encryption
global.crypto = require('crypto');

// Custom csrf library
var csrf = require('./csrf');

server.use(filter_by_Header);
function filter_by_Header(req, res, next) {
  if (req.headers['user-agent'] === 'ELB-HealthChecker/1.0') {
    return res.send(200);
  }
  
  next();
}

server.configure(function() {
  var options = {
    host: 'session.iewfre.0001.apne1.cache.amazonaws.com',
    port: 6379
  };

  var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', req.headers.origin ? req.headers.origin : '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    res.header('P3P:CP', 'IDC DSP COR ADM DEVi TAIi PSA PSD IVAi IVDi CONi HIS OUR IND CNT');
    next();
  }

  server.use(express.cookieParser('jumpingnuts@Ajou'));

  if (config.env === 'production') {
    var RedisStore = require('connect-redis')(express.session);
    server.use(express.session(
      { store: new RedisStore(options), cookie: { path: '/', maxAge: 6 * 60 * 60 * 1000/*, domain: config.domain*/ }, secret: 'jumpingnuts@Ajou' }
    ));
  } else {
    server.use(express.session());
  }
  server.use(connect.bodyParser());
  server.use(allowCrossDomain);
//  server.use(csrf.check);
  server.use(passport.initialize());

  // Use some Strategy within Passport.
  require('./strategy');

  if (config.env === 'production') {
    server.use(passport.session(
      { store: new RedisStore(options), secret: 'jumpingnuts@Ajou' }
    ));
  } else {
    server.use(passport.session());
  }
});

server.use(function (req, res, next) {
  if (req.user && req.user.scope) {
    // eliminate old token infomation
    req.logout(); 
  }
  if (req.query.access_token || req.body.access_token) {
    var method = req.method.toLowerCase();
    passport.authenticate('bearer', { session: false }, function(err, token) {
      if (!token) {
        return method === 'get' ? next() : res.json(401, {'message': err});
      } else if (true) {    // TODO: scope check
        db.users.find(token.user_id, function(uerr, user) {
          if (uerr) {
            return method === 'get' ? next() : res.json(500, {'message': uerr});
          } else if (!user) {
            return method === 'get' ? next() : res.json(400, {'message': 'invalid user'});
          } else {
            delete user.password;
            
            delete req.query.access_token;
            delete req.query.token_type;
            delete req.body.access_token;
            delete req.body.token_type;
            
            user.scope = token.scope;
            req.logIn(user, function(err) {
              return next();
            });
          }
        });
      } else {
        return method === 'get' ? next() : res.json(401, {'message': 'cannot access user infomation with this token'});
      }
    })(req, res, next);
  } else {
    next();
  }
});
// route rule

//server.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

require('./routes')(server);

server.get('/auth/facebook/callback', controllers.auth.connect);

server.post('/oauth/token', oauth2.token);

server.options('/*', function(req, res) {
  res.send(200);
});

//utils.sendMail();

server.listen(process.env.PORT || config.port, function(){
  console.log('%s listening at %s', server.name, process.env.PORT || config.port);
});
