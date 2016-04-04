/*
 * RESTful user(membership) api
 * Create(post)	- regist
 * Read(get)	- 
 * Update(put)	- update
 * Delete(del)	- withdraw
 */

//

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var db = require('../db');
var login = require('connect-ensure-login');

exports.registForm = function(req, res) {
  res.render('regist');
};

exports.regist = function(req, res, next) {
  // req.body.type
  // req.body.id
  // req.body.password
  // req.body.name
  if (!req.body.email || !req.body.password || !req.body.name) {
    return res.json(400, {'message': 'missing parameter'});
  }
  // check password validation
  if (req.body.password !== req.body.passwordChk) {
    return res.json(400, {'message': 'check password validation'});
  }

  var reqInfo = req.body;
  db.users.save(reqInfo, function cbRegistNewUser(err, user, info) {
    if (err) { return res.json(500, {'message': info }); }
    if (!user) { return res.json(400, {'message': info }); }

    req.logIn(user, function(err) {
      var result = {
        'id': user.id,
        'email': user.email
      };

      return res.json(200, result);
    });
  });
};

exports.update = [
  passport.authenticate('bearer', { session: false, assignProperty: 'token' }),
  function(req, res) {
    if (req.token.scope.indexOf('userinfo') >= 0) {
      db.users.update();
      db.users.find(req.token.user_id, function(err, user) {
        if (err) {
          return res.json(500, err);
        } else if (!user) {
          return res.json(400, {'message': 'invalid user'});
        } else {
          delete user.password;
          delete user.kakao;
          return res.json(200, user);
        }
      });
    }
  }
]

exports.withdraw = function(req, res, next) {
  // 
};

exports.get = [
  passport.authenticate('bearer', { session: false, assignProperty: 'token' }),
  function(req, res) {
    if (req.token.scope.indexOf('userinfo') >= 0) {
      db.users.find(req.token.user_id, function(err, user) {
        if (err) {
          return res.json(500, {'message': 'internal error'});
        } else if (!user) {
          return res.json(400, {'message': 'invalid user'});
        } else {
          delete user.password;
          return res.json(200, user);
        }
      });
    } else {
      return res.json(401, {'message': 'cannot access user infomation with this token'});
    }
  }
];

exports.getSelf = [
//  login.ensureLoggedIn({ redirectTo: '/dialog/login', setReturnTo: true }),
  function(req, res) {
    if(req.user) {
      return res.json(200, req.user);
    } else {
      return res.json(401, {'message': 'not logged in'});
    }
  }
];




/* userconnection */
/* user connection */

//user connection
exports.setUserConnection = function(req, res){
  //var uid = req.body.uid;
  var connectionProvider = req.body.connectionProvider;
  var connectionProfile = req.body.connectionProfile;

  //console.log(connectionProvider);
  //console.log(connectionProfile);

  if(connectionProvider === null || connectionProfile === null) {
    return res.json(400, {'message': 'mising parameter'});
  }

  var query;
  if (req.user) {
    if(req.params.id) {
      //update
  		query = "UPDATE `user_connections` SET"+
          "`profile`='"+connectionProfile+"',"+
          "`updated`=NOW()"+
          "WHERE (`uid`='"+req.params.id+"' OR `email`='"+req.params.id+"') AND `provider`='"+connectionProvider+"';";
  	} else {
      query = "INSERT INTO `user_connections` " +
          "(`uid`, `email`, `provider`, `profile`, `key`, `updated`, `created`) "+
          "VALUES "+
          "('"+req.user.id+"', '"+req.user.id+"', '"+connectionProvider+"', '"+connectionProfile+"', MD5(CONCAT('"+req.user.id+"_',NOW())), NOW(), NOW());";
  	}
	} else {
    return res.json(401, {'message': 'authentification failed'});
  }

  //console.log(query);
	var dbcon = global.mysql.createConnection(global.mysqlConfig);
	dbcon.query(query, function(err, rows) {
		if(err) {
      return res.json(500, {'message': 'failed to query database'});
		}
		
		return res.json(200, req.params.id ? rows[0] : rows);
	});

	dbcon.end();
};

/*****
app.get('/api/userConnection', controllers.getUserConnection);  //admin
app.get('/api/userConnection/:id', controllers.getUserConnection);  //owner, admin
*****/
exports.getUserConnection = function(req, res){
  console.log(req.user);
  var query;

  //already logged in
  if (req.user) {
    query = "SELECT `uid`, `email`, `provider`, `profile`, `key`, `updated`, `created` FROM `user_connections` "+
      "WHERE `email`='"+req.user.id+"';";
  } else {
    return res.json(401, {'message': 'authentification failed'});
  }

	var dbcon = global.mysql.createConnection(global.mysqlConfig);
	dbcon.query(query, function(err, rows) {
		if(err) {
			return res.json(500, {'message': 'failed to query database'});
		}
    //console.log(rows);
      console.log(rows[0]);

		return res.json(200, rows[0]);
		
	});

	dbcon.end();
};

exports.delUserConnection = function(req, res){
	var dbcon = global.mysql.createConnection(global.mysqlConfig);
	dbcon.query("SELECT * FROM `gl_articles` LIMIT 0, 10", function(err, rows) {
		if(err) {
		  return res.json(500, {'message': 'failed to qurey database'});
		}
		
		return res.json(200, rows);
	});

	dbcon.end();
};




