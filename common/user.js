/*
 * common/users.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 13
 * USER COLLECTION
 */

// GET USERS (MY INFO)
exports.get = function(req, res, next) {
  var result = {
    'code': 400,
    'message': 'bad request'
  };
  
  if (req.params.id) {
    var id = req.params.id === 'me' ? (req.user ? req.user.id : null) : req.params.id;
    if (!id) {
      result['code'] = 401;
      result['message'] = 'not logged in';
      return res.json(401, result);
    }
    
    db.users.find(id, function cbFind(err, user) {
      if (err === 'ConditionalCheckFailedException') {
        result['code'] = 409;
        result['message'] = err;
        return res.json(409, result);
      } else if (err) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      } else if (!user) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      }

      var result = {};
      if (user.id === (req.user ? req.user.id : null)) {
        result['User'] = user;
      } else {
        result['User'] = {};
        result['User'].id = user.id;
        result['User'].name = user.name;
      }
      
      delete user.password;
      result['code'] = 200;
      result['message'] = 'OK';
      result['User'] = user;
      return res.json(200, result);
    });
  } else if (req.user) {
    result['code'] = 200;
    result['message'] = 'OK';
    result['User'] = req.user;
    return res.json(200, result);
  } else {
    return res.json(401, {'message': 'not logged in'});
  }
}

// GET USERS (MY INFO)
exports.list = function(req, res, next) {
  
}

// SET USERS (ADD/UPDATE)
exports.set = function(req, res, next) {
  var result = {
    'code': 400,
    'message': 'bad request'
  };
  
  var redirect_uri = req.session && req.session.returnTo ? req.session.returnTo : req.body.returnTo;
  redirect_uri = redirect_uri ? redirect_uri + '&from=regist' : null;
  delete req.session.returnTo;
  
  if (!req.params.id) {
    if (!req.body.email || !req.body.password) {
      return res.json(400, {'message': 'missing parameter'});
    }
    
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
        return res.render('regist', {'message': '이메일 또는 닉네임을 사용할 수 없습니다.'});
        return res.json(409, {'message': err});
      } else if (err) {
        return res.render('regist', {'message': '알 수 없는 에러가 발생했습니다. 다시 시도해주세요.'});
        return res.json(500, {'message': err});
      } else if (!user) {
        return res.render('regist', {'message': err});
        return res.json(500, {'message': 'unknown error'});
      }

      delete user.password;
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
          return res.redirect(redirect_uri);
        } else {
          result['code'] = 200;
          result['message'] = 'OK';
          result['User'] = user;
          return res.json(200, user);
        }
      });
    });
  } else {
    // modify my userinfo
    if (req.params.id === 'me' || req.params.id === req.user.id) {
      if (!req.user) {
        return res.json(401, {'message': 'not logged in'});
      }
      var key = {
        id: req.user.id
      };

      var reqBody = req.body;
      
      // cannot modify id
      delete reqBody.id;
      delete reqBody.email;
      delete reqBody.kakao;
            
      switch (req.params.attribute) {
        case 'connection':
          if (!reqBody.connectionProvider) {
            return res.json(400, {'message': 'missing parameter'});
          }
          
          var unique = reqBody.connectionProvider.substring(0,3) + req.user.id.substring(2,4) + new Date().getTime();
          var connectionKey = crypto.createHash('md5').update(unique).digest("hex");

          reqBody[reqBody.connectionProvider] = connectionKey;
          delete reqBody.connectionProvider;
          break;
        default:
          break;
      }

      db.users.update(key, reqBody, function(err, user) {
        delete user.password;
        delete user.kakao;
        delete user.facebook;
        
        req.logIn(user, function(err) {
          if (req.params.attribute === 'connection') {
            user['connectionKey'] = connectionKey;
          }
          
          return res.json(200, user);
        });
      });
    } else if (req.user.id !== req.params.id) {
      return res.json(401, {'message': 'cannot modify others'});
    }
  }
}

// DEL USERS
exports.del = function(req, res, next) {
  res.json(200, {'message': 'OK'});
}

exports.reset = function(req, res, next) {
  var result = {
    'code': 400,
    'message': 'bad request'
  };

  if (!req.body.email || !req.body.returnTo) {
    return res.json(400, {'message': 'invalid request'});
  }

  db.users.findUserByEmail(req.body.email, function(err, user) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    } else if (!user) {
      result['code'] = 400;
      result['message'] = 'invalid request';
      return res.json(400, result);
    }
    
    // set reset key
    var key = Math.floor(Math.random() * 1000000) + '';
    db.users.update({'id': user.id}, {'reset': key});
    
    var url = 'http://dev.jumpingnuts.com:9000/dialog/reset_password?returnTo='+ encodeURIComponent(req.body.returnTo) + '&id=' + user.id.toString() + '&email=' + user.email + '&key=' + key;
    
    utils.sendMail([user.email], '점핑너츠 비밀번호 찾기 확인 이메일입니다', '아래 링크를 눌러주세요.<p>' + url);
    
    return res.send('메일이 발송되었습니다. 다시 비밀번호를 설정해주세요.');
//    res.render('reset_password', options);
  });
}
