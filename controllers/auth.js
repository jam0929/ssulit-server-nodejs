/*
 * RESTful auth(session) api
 * Create(post)	- sign-in
 * Read(get)	-
 * Update(put)	-
 * Delete(del)	- sign-out
 */

//
var passport = require('passport');
var login = require('connect-ensure-login');

exports.loginForm = function(req, res) {
  var options = {};
  
  if (req.session.returnTo) {
    options.returnTo = req.session.returnTo;
    delete req.session.returnTo; 
  }
  
  for (var prop in req.query) {
    options[prop] = req.query[prop];
  }
  
  // check required parameter
  var response = { 'response': 500, 'message': 'unknown' };
  if (!options.returnTo && !options.redirect_uri) {
    response.response = 400;  // Bad Request
    response.message = 'Bad Request'
    
    return res.json(response);
  }
  
  return res.render('login', options);
};

exports.logoutForm = function(req, res) {
  res.render('logout');
};

exports.signin = function(req, res, next) {
  if (req.body.connectionProvider) {
    // connection login
    // get connection info
    var query = "SELECT `uid`, `email`, `provider`, `profile`, `key`, `updated`, `created` FROM `user_connections` "+
        "WHERE `email`='"+req.body.email+"' AND `key`='"+req.body.connectionKey+"' AND `provider`='"+req.body.connectionProvider+"';";

  	var dbcon = global.mysql.createConnection(global.mysqlConfig);
  	console.log(query);
  	dbcon.query(query, function(err, rows) {
  		if(err) {
  			return res.json(500, {'message': 'failed to query database'});
  		} else if (rows.length === 0) {
    		return res.json(401, {'message': 'not registered user'});
  		}
  		dbcon.close();
  		
      //console.log(rows);
        console.log(rows[0]);
      
      var db = require('../db');
      db.users.find(req.body.email, function cbFind(err, user) {
        delete user.password;
        
        req.logIn(user, function(err) {
          if (err) {
      			return res.json(500, {'message': 'failed to query database'});
          }
          
          return res.json(200, user);
        });
      });
  		
  	});
  } else {
    passport.authenticate('local', function(err, user, info) {
      // login failed. try again.
      var query = '';
  
      if (err) { return next(err) }
      if (!user) {
        req.session.messages = info.message;
        
        if ((!req.body.redirect_uri || req.body.redirect_uri === 'undefined') && !req.body.returnTo) {
          return res.json(401, {'message': 'authorization failed'});
        }
  
        for (var prop in req.body) {
          if (prop !== 'id' && prop !== 'password' && prop !== 'type')
            query += '&' + prop + '=' + req.body[prop];
        }
        
        var location = req.headers.origin + '/dialog/login?' + query;
        return res.redirect(location);
      }
      
      req.logIn(user, function(err) {
        if ((!req.body.redirect_uri || req.body.redirect_uri === 'undefined') && !req.body.returnTo) {
          return res.json(200, user);
        }
        
        if (err) { return next(err); }
        return res.redirect(req.body.returnTo || req.body.redirect_uri);
      });
    })(req, res, next);
  }
}

exports.connect = function(req, res) {


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
}

exports.connect = [
  passport.authenticate('facebook', function(err, connection, info) {
    console.log(err);
    console.log(connection);
    console.log(info);
    return true;
  }),
  function(req, res) {
    var options = {};
    options.redirect_uri = '/dialog/connect';
    options.email = req.user.email;
    options.name = req.user.name;
    options.open_type = 'iframe';
    return res.render('close_parent', options);
  }
]/*
exports.connect = function(req, res, next) {
console.log(req.query);
  passport.authenticate('facebook', function(err, profile) {
    console.log(profile);
    res.json(profile);
  });
}*/

exports.logout = function(req, res) {
  req.logout();
  if(req.query.redirect_uri)
    return res.redirect(decodeURIComponent(req.query.redirect_uri));

  return res.json(200, {'message':'OK'});
}

exports.self = [
  function(req, res) {
    if(req.user) {
      return res.json(200, req.user);
    }
    
    return res.json(401, {'message':'Unauthorized'});
  }
]