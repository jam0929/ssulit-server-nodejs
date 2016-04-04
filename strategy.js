/**
 * Module dependencies.
 */
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var DeviceStrategy = require('./middleware/passport-device').Strategy;
var db = require('./db');
var redis = require('redis');
var async = require('async');

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(id, done) {
  done(null, id);
});

/**
 * LocalStrategy
 *
 * This strategy is used to authenticate users based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: 'true'
  }, function validation(req, email, password, done) {
    var results = {};
    db.users.findUserByEmail(email, function(err, user) {
      if (user) {
        var md5Password = crypto.createHash('md5').update(password).digest("hex");
        if (user.password != md5Password) {
          err = 'Incorrect password.';
          user = null;
        } else {
          delete user.password;
        }
        
        results.user = user;
      }
      
      return done(err, results);
    });
  })
);

/**
 * BearerStrategy
 *
 * This strategy is used to authenticate either users or clients based on an access token
 * (aka a bearer token).  If a user, they must have previously authorized a client
 * application, which is issued an access token to make requests on behalf of
 * the authorizing user.
 */
passport.use(new BearerStrategy(
  function(access_token, done) {
    if (!access_token) {
      return done('invalid request', null);
    }
    
    async.waterfall([
      function(callback) {
        // check token exists in redis
        global.redisClient.get(access_token, function(err, reply) {
          if (err) {
            return callback(err, null);
          } else if (!reply) {
            return callback(null, null);
          } else {
            var token = JSON.parse(reply);
            return callback(null, token);
          }
        });
      }, function(_token, callback) {
        // check token exists in db
        if (_token) {
          return callback(null, _token);
        } else {
          var key = { 'key': access_token };
          db.accessTokens.find(key, function(err, token) {
            if (err) {
              return callback(err, null);
            } else if (!token) {
              return callback('invalid token', null);
            }
            return done(null, token);
          });
        }
      }], function(err, token) {
        // endpoint
        if (err) {
          return done(err, null);
        } else if (token) {
          if (token.expires < +new Date()) {
            return callback('token expired', null);
          }
          
          global.redisClient.set(access_token, JSON.stringify(token));
          global.redisClient.pexpireat(access_token, token.expires);
          
          return done(null, token);
        } else {
          return done('unexpected error', null);
        }
      });
    }
  )
);

/**
 * DeviceStrategy
 */
passport.use(new DeviceStrategy({
  passReqToCallback: 'true'
  }, function(req, appName, deviceId, clientId, done) {
    async.waterfall([
      function(callback) {
        // check if exists in db
        var key = {
          'deviceId': req.body.deviceId,
          'appName': req.body.appName
        };

        db.devices.find(key, function(err, info) {
          if (err) {
            return callback(err, null);
          } else if (!info || !info.user_id) {
            return callback('authorization failed', null);
          } else {
            return callback(null, info.user_id);
          }
        });
      }, function(_userId, callback) {
        db.users.find(_userId, function(err, user) {
          if (err) {
            return callback(err, null);
          } else if (user) {
            delete user.password;
            return callback(null, user);
          } else {
            return callback('authorization failed', null);
          }
        });
      }, function(user, callback) {
        if (!user) {
          return callback('authorization failed', null);
        } else {
          // get token info
          var keyTemplate = {
            'AttributeValueList': [],
            'ComparisonOperator': ''
          };
          var keyToken = {};
          var options = {};
          var keyUserID = JSON.parse(JSON.stringify(keyTemplate));
          keyUserID['AttributeValueList'].push({'N': user.id});
          keyUserID.ComparisonOperator = 'EQ';    
          keyToken['user_id'] = keyUserID;
          
          var keyClientID = JSON.parse(JSON.stringify(keyTemplate));
          keyClientID['AttributeValueList'].push({'S': clientId});
          keyClientID.ComparisonOperator = 'EQ';    
          keyToken['client_id'] = keyClientID;
      
          options.IndexName = 'user_id-client_id-index';
      
          options.Limit = 1;
          db.accessTokens.query(keyToken, options, function(err, token) {
            if (err) {
              return callback(err, null);
            } else {
              var results = {
                'user': user,
                'token': token.data.length > 0 ? token.data[0] : null
              };
              
              return callback(null, results);
            }
          });
        }
      }
    ], function(err, results) {
      // endpoint
      if (err) {
        return done(err, null);
      } else if (results) {
        return done(null, results);
      } else {
        return done(true, null, 'unexpected error');
      }
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: '264001293758406',
    clientSecret: '7882ca0b7313eb8961dd0024f22ec18a',
    callbackURL: '/auth/facebook/callback',
    passReqToCallback: 'true'
  },
  function(req, accessToken, refreshToken, profile, done) {
    if (!profile) {
      // access deny
      return done(true, null, 'deny');
    }
    
    var key = {
      'provider': profile.provider,
      'key': profile._json.email
    };

    db.connections.find(key, function(err, connection) {
      if (err) { return done(true, null, err); }
      if (!connection) {
        var options = {};
        options['access_token'] = accessToken;
        if (refreshToken) {
          options['refresh_token'] = refreshToken;
        }

        db.users.findUserByEmail(profile._json.email, function(uerr, user) {
          if (uerr) { return done(true, null, uerr); }
          if (!user) {
            // regist user
            var current = +new Date();
            var id = (+new Date() * 100) + Math.floor(Math.random() * 100);
            
            var keyUser = {
              'id': id.toString(),
              'email': profile._json.email
            };
            
            if (profile._json.name) {
              keyUser['nickname'] = profile._json.name;
            };
            
            var reqBody = req.body;
            var reqBody = {
              'nickname': profile.username,
              'email': profile._json.email,
              'referer': profile.provider
            };

            db.users.regist(keyUser, reqBody, function(reerr, reuser) {
              if (reerr === 'ConditionalCheckFailedException') {
                return done(true, null, 'already exists');
              } else if (reerr) {
                return done(true, null, reerr);
              } else if (!reuser) {
                return done(true, null, 'unknown error');
              }

              delete reuser.password;
              req.logIn(reuser, function(err) {
                // regist connection
                registConnection(profile.provider, profile._json.email, id, options, function(cerr, info) {
                  if (cerr) {
                    return done(true, null, cerr);
                  }
                  return done(true, reuser);
                });
              });
            });
          } else {
            registConnection(profile.provider, profile._json.email, user.id, options, function(cerr, info) {
              if (cerr) {
                return done(true, null, cerr);
              }
              
              req.logIn(user, function(err) {
                return done(null, user);
              });
            });
          }
        });
      } else {
        db.users.find(connection.user_id.toString(), function(uerr, user) {
          if (uerr) {
            return done(true, null, uerr);
          }
          
          req.logIn(user, function(err) {
            return done(null, user);
          });
        });
      }
    });
  }
));

function registConnection(provider, keyString, user_id, options, doneConnection) {
  var key = {
    'provider': provider,
    'key': keyString
  };
  db.connections.find(key, function(err, connection) {
    if (err) { return doneConnection(err); }
    if (!connection) {
      // regist connection
      var key = {
        'provider': provider,
        'key': keyString
      };
      
      var reqBody = options ? options : {};
      reqBody['user_id'] = user_id;
      db.connections.save(key, reqBody, function(_err, _connection) {
        if (_err) { return doneConnection(_err); };
        return doneConnection(null, _connection);
      });
    } else {
      return doneConnection(null, connection);
    }
  });
}
