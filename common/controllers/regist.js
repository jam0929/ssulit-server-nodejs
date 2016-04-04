/*
 * common/controllers/regist.js
 * AUTHOR : beryh
 * DATE : 2014. 4. 14
 * REIGSTRATION
 */
 
var async = require('async'); 

module.exports = function(req, res, next) {
  var result = {
    'code': 400,
    'message': 'bad request'
  };
  
  var redirect_uri = req.session && req.session.returnTo ? req.session.returnTo : req.body.returnTo;
  delete req.session.returnTo;
  
  async.waterfall([
    function(callback) {
      var current = +new Date();
      var id = (+new Date() * 100) + Math.floor(Math.random() * 100);
      var key = {
        'id': id.toString(),
        'email': req.body.email
      };
      
      if (req.body.nickname) {
        key['nickname'] = req.body.nickname;
      }
      
      var reqBody = req.body;
      
      db.users.regist(key, reqBody, function(err, user) {
        if (err === 'already exists') {
          return callback('이메일 또는 닉네임을 사용할 수 없습니다.', null);
        } else if (err || !user) {
          return callback('알 수 없는 에러가 발생했습니다. 다시 시도해주세요.');
        }
  
        delete user.password;
        return callback(null, user);
      });
    }
  ], function(err, user) {
    if (err) {
      return res.render('regist', { 'message': err, 'returnTo': redirect_uri });
    }
    
    req.logIn(user, function(err) {
      if (req.session.deviceInfo) {
        for (var appName in req.session.deviceInfo) {
          if (req.session.deviceInfo[appName] !== user[appName]) {
            var regId = {};
            regId[appName] = req.session.deviceInfo[appName].regId;
            var keyDevice = {'appName': appName, 'deviceId': req.session.deviceInfo[appName].deviceId};
            db.users.update({'id': user.id}, regId);
            db.devices.update(keyDevice, {'user_id': user.id});
          }
        }
      }

      if (redirect_uri) {
        redirect_uri = redirect_uri ? redirect_uri + '&from=regist' : null;
        return res.redirect(redirect_uri);
      } else {
        result['code'] = 200;
        result['message'] = 'OK';
        result['User'] = user;
        return res.json(200, user);
      }
    });
  });
}
