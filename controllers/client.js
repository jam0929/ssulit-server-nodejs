
/*
 * RESTful client/prj api
 * set(post)   - add new client
 * Read One(get)  - get information of a shop
 * Read All(get)  - get information of entire shops with token
 * Update(put)    - update
 * Delete(del)    - remove the client
 */

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var utils = require('../utils');
var db = require('../db');

var CLIENT_SECRET_LENGTH = 32;

exports.createForm = function(req, res) {
  res.render('create_client');
};

function generateSecret() {
  return utils.uid(CLIENT_SECRET_LENGTH);
}

// create new project
exports.create = function(req, res, next) {
  var result = {
    code: 400,
    message: 'bad request'
  };
  
  // check user is developer
  if (req.user.isDeveloper) {
    var unique = req.user.email.substring(0,6) + new Date().getTime();
    var key = {
      'id': crypto.createHash('md5').update(unique).digest("hex")
    };

    var reqBody = req.body;
    reqBody['secret'] = generateSecret();
    reqBody['owner'] = req.user.id;
    
    db.clients.save(key, reqBody, function cbCreateClient(err, info) {
      if (err) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      }

      result['code'] = 201;
      result['message'] = 'OK';
      result['Client'] = info;
      
      return res.json(201, result);
    });
  } else {  
    result['code'] = 401;
    result['message'] = 'only developer can create client';
  
    return res.json(401, result);
  }
}

// get project list
exports.list = function(req, res, next) {
  var response = { 'response': 500, 'message': 'unknown' };
  // check user is developer
  if (req.user.isDeveloper) {      
    response['response'] = 200;
    response['message'] = 'OK';
    response['clients'] = req.user.clients;
  } else {
    response['response'] = 401;
    response['message'] = 'only developer can have client';
  }
  
  return res.json(response);
}

// get project info
exports.info = function(req, res) {
  var response = { 'response': 500, 'message': 'unknown' };
  
  // check user is developer
  if (req.user.isDeveloper) {
    var isParticipated = false;
    for (var i = 0; i < req.user.clients.length; i++) {
      if (req.user.clients[i].id === req.params.id) {
        isParticipated = true;
        
        db.clients.find(req.params.id, function cbFindClient(err, client) {
          if (err) return res.json(err);
          response['response'] = 200;
          response['message'] = 'OK';
          response['client'] = client;
          
          return res.json(response);
        });
        
        break;
      }
    }
    
    if (!isParticipated) {
      response['response'] = 401;
      response['message'] = 'you have no permission to access this client';
      
      return res.json(response);
    }
  } else {
    response['response'] = 401;
    response['message'] = 'only developer can create client';
  
    return res.json(response);
  }
}

exports.update = function(req, res) {
  var response = { 'response': 500, 'message': 'unknown' };
  
  // check user is developer
  if (req.user.isDeveloper) {
    var isParticipated = false;
    for (var i = 0; i < req.user.clients.length; i++) {
      if (req.user.clients[i].id === req.params.id) {
        isParticipated = true;
        
        db.clients.find(req.params.id, function cbFindClient(err, client) {
          if (err) return res.json(err);
          if (client.owner === req.user.id) {
            var updateList = req.body;
            if (updateList.secret) {
              updateList.secret = generateSecret();
            }
            
            db.clients.update(req.params.id, updateList, function cbUpdateClient(err, client) {
              if (err) return res.json(err);
  
              response['response'] = 200;
              response['message'] = 'OK';
              response['client'] = client;
              
              return res.json(response);
            });
          } else {
            response['response'] = 401;
            response['message'] = 'you are not owner';
            
            return res.json(response);
          }
        });
        
        break;
      }
    }
    
    if (!isParticipated) {
      response['response'] = 401;
      response['message'] = 'you have no permission to access this client';
      
      return res.json(response);
    }
  } else {
    response['response'] = 401;
    response['message'] = 'only developer can create client';
  
    return res.json(response);
  }
}

// delete project
exports.delete = function(req, res) {
  var response = { 'response': 500, 'message': 'unknown' };
  
  // check user is developer
  if (req.user.isDeveloper) {
    var isParticipated = false;
    for (var i = 0; i < req.user.clients.length; i++) {
      if (req.user.clients[i].id === req.params.id) {
        isParticipated = true;
        
        db.clients.find(req.params.id, function cbFindClient(err, client) {
          if (err) return res.json(err);
          if (client.owner === req.user.id) {
            var updateList = req.body;
            if (updateList.secret) {
              updateList.secret = generateSecret();
            }
            
            db.clients.delete(req.params.id, function cbDeleteClient(err, client) {
              if (err) return res.json(err);
  
              response['response'] = 200;
              response['message'] = 'OK';
              response['client'] = client;
              
              return res.json(response);
            });
          } else {
            response['response'] = 401;
            response['message'] = 'you are not owner';
            
            return res.json(response);
          }
        });
        
        break;
      }
    }
    
    if (!isParticipated) {
      response['response'] = 401;
      response['message'] = 'you have no permission to access this client';
      
      return res.json(response);
    }
  } else {
    response['response'] = 401;
    response['message'] = 'only developer can create client';
  
    return res.json(response);
  }
}

exports.unlink = function(req, res) {
  var response = { 'response': 500, 'message': 'unknown' };
  
  // check user is developer
  if (req.user.isDeveloper) {
    var isParticipated = false;
    for (var i = 0; i < req.user.clients.length; i++) {
      if (req.user.clients[i].id === req.params.id) {
        isParticipated = true;
        
        db.clients.find(req.body.client_id, function cbFindClient(err, client) {
          if (err) return res.json(err);
          if (client.owner === req.user.id) {
            var updateList = req.body;
            if (updateList.secret) {
              updateList.secret = generateSecret();
            }
            
            db.clients.delete(req.params.id, function cbDeleteClient(err, client) {
              if (err) return res.json(err);
  
              response['response'] = 200;
              response['message'] = 'OK';
              response['client'] = client;
              
              return res.json(response);
            });
          } else {
            response['response'] = 401;
            response['message'] = 'you are not owner';
            
            return res.json(response);
          }
        });
        
        break;
      }
    }
    
    if (!isParticipated) {
      response['response'] = 401;
      response['message'] = 'you have no permission to access this client';
      
      return res.json(response);
    }
  } else {
    response['response'] = 401;
    response['message'] = 'only developer can create client';
  
    return res.json(response);
  }
}

/*
exports.info = [
  passport.authenticate('bearer', { session: false }),
  function(req, res) {
    console.log(req.authInfo);
    // req.authInfo is set using the `info` argument supplied by
    // `BearerStrategy`.  It is typically used to indicate scope of the token,
    // and used in access control checks.  For illustrative purposes, this
    // example simply returns the scope in the response.
    res.json({ user_id: req.user.id, name: req.user.name, scope: req.authInfo.scope })
  }
];

*/