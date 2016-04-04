/*
 * common/controllers/login.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 13
 * AUTHORIZATION
 * AUTH : EMAIL/PASSWORD
 * KAKAO : EMAIL/KEY/PROVIDER
 */
 
var async = require('async'); 
var providers = [
  'kakao'
];

module.exports = function(req, res, next) {
  var result = {
    'code': 400,
    'message': 'bad request'
  };
  
  var authModule = '';
  // split for each passport type
  if (req.body.connectionProvider) {
    authModule = 'connection';
  } else if (!req.body.email && req.body.deviceId && req.body.appName && req.body.clientId) {
    authModule = 'device';
  } else {
    authModule = 'local';
    
    if (req.body.reset && (req.body.id && req.body.password)) {
      var md5Password = crypto.createHash('md5').update(req.body.password).digest("hex");

      db.users.update({'id': req.body.id}, {'password': md5Password, 'reset': ''});
    }
  }
  
  async.waterfall([
    function(callback) {
      passport.authenticate(authModule, function(err, pResult) {
        if (err) {
          // error occured
          return callback(err, null);
        } else if (!pResult || !pResult.user) {
          return callback('authorization failed', null);
        } else {
          var authResult = {
            'User': pResult.user
          };
          switch(authModule) {
            case 'device':
              authResult['Token'] = {};
              
              if (pResult.token) {
                authResult['Token'].access_token = pResult.token.key;
                authResult['Token'].expire_in = pResult.token.expires;
                authResult['Token'].token_type = 'bearer';
              }
              break;
            default:
              break;
          }
          
          return callback(null, authResult);
        }
      }) (req, res, next);
    }
  ], function(err, authResult) {
    // endpoint
    if (err || !authResult) {
      // authorization fail
      // redirect if uri exists
      if (req.body.redirect_uri || req.body.returnTo) {
        var options = {};
        for (var prop in req.body) {
          if (prop !== 'email' && prop !== 'password')
            options[prop] = req.body[prop];
        }
        
        options.message = '로그인을 실패했습니다.';
        return res.render('signin', options);
      } else {
        // send fail message in JSON
        result['code'] = 401;
        result['message'] = err;
        return res.json(401, result);
      }
    } else {
      req.logIn(authResult.User, function(err) {
        db.users.update({'id': authResult.User.id}, {'lastLogin': new Date()});
        
        //update device info
        if (req.session.deviceInfo) {
          for (var appName in req.session.deviceInfo) {
            if (req.session.deviceInfo[appName] !== authResult.User[appName]) {
              var regId = {};
              regId[appName] = req.session.deviceInfo[appName].regId;
              var keyDevice = {'appName': appName, 'deviceId': req.session.deviceInfo[appName].deviceId};
              db.users.update({'id': authResult.User.id}, regId);
              db.devices.update(keyDevice, {'user_id': authResult.User.id});
            }
          }
        }
        
        if (req.body.redirect_uri || req.body.returnTo) {
          return res.redirect(decodeURIComponent(req.body.returnTo || req.body.redirect_uri));
        } else {
          result = authResult;
          result['code'] = 201;
          result['message'] = 'OK';

          return res.json(201, result);
        }
      });
    }
  });
}
