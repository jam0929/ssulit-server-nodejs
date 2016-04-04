/*
 * clients.js
 * AUTHOR : beryh
 * DATE : 2014. 1. 13
 * CLIENT COLLECTION
*/

// GET CLIENTS (MY INFO)
exports.get = function(req, res, next) {
  if (!req.user) {
    return res.json(401, {'message': 'not logged in'});    
  }
  
  if (req.params.id) {
    var reqInfo = {
      'id': req.params.id
    }
    
    db.clients.find(reqInfo, function(err, client) {
      if (err) { return res.json(500, {'message': err }); }
      if (!client) { return res.json(404, {'message': err }); }

      return res.json(200, client);
    });
  } else {
    if (req.user.clients) {
      return res.json(200, req.user.clients);
    } else if (req.user.isDeveloper) {
      return res.json(204, {});
    } else {
      return res.json(401, {'message': 'unauthorized'});
    }
  }
}

// SET CLIENT (ADD/UPDATE)
exports.set = function(req, res, next) {
  // check user is developer
  if (req.user.isDeveloper) {
    if (req.params.id) {
      // update
      
    } else {
      // insert
      var reqInfo = req.body;
      
      var unique = req.user.email.substring(0,6) + new Date().getTime();
      var clientId = crypto.createHash('md5').update(unique).digest("hex");
      
      reqInfo['id'] = clientId;
      reqInfo['secret'] = generateSecret();
      reqInfo['owner'] = req.user;

      db.clients.save(reqInfo, function cbCreateClient(err, client) {
        if (err) return res.json(500, {'message': err});
        req.user.clients.push({'id': client.id, 'name': client.name});
        
        return res.json(200, client);
      });
    }
  } else {
    return res.json(401, {'message': 'unauthorized'});
  }
}

// DEL USERS
exports.del = function(req, res, next) {
  res.json(200, {'message': 'OK'});
}