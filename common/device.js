/*
 * devices.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 22
 * DEVICES COLLECTION
*/

exports.regist = function(req, res, next) {
  var regId = req.body.regId;
  var deviceId = req.body.deviceId;
  var appName = req.body.appName;

  if (!regId || !deviceId || !appName) {
    return res.json(400, {'message': 'mising parameter'});
  }

  req.session.deviceInfo = {};
  req.session.deviceInfo[appName] = {
    'deviceId': deviceId,
    'regId': regId
  };
  
  var key = {
    'deviceId': deviceId,
    'appName': appName
  };
  
  if (req.user) {
    var keyUser = {
      'id': req.user.id
    };
    if (req.user[appName] !== regId) {
      var reqBody = {};
      reqBody[appName] = regId;
      
      db.users.update(keyUser, reqBody);
    }
  }

  db.devices.find(key, function(err, info) {
    if (err) {
      return res.json(500, {'message': 'internal error'});
    }
    
    if (info && info.regId === regId) {
      return res.json(200, info);
    }

    var reqBody = req.body;
    delete reqBody.deviceId;
    delete reqBody.appName;
    reqBody['created'] = (+new Date()).toString();

    db.devices.update(key, reqBody, function(_err, _info) {
      if (_err) {
        return res.json(500, {'message': 'internal error'});
      }

      return res.json(201, _info);
    });
  });
}


exports.merge = function(req, res) {
  var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
  var query = "SELECT reg_id, device_id, type FROM `Devices` WHERE type = '" + req.body.type + "'";
  var limit = req.body.limit ? req.body.limit : 500;

  dbcon.query(query, function(err, rows) {
		if(err) {
			console.log(err);
			return res.send(500);
		}
		
		for(var i = 0; i < rows.length; i++) {
  		db.devices.save({'appName': rows[i].type, 'deviceId': rows[i].device_id.toString()}, {'created': +new Date(), 'regId': rows[i].reg_id}, function(_err, _info) {
  		  if (_err) {
  		    console.log(rows[i]);
    		  console.log(_err);
    		}
  		});
		}
		
		dbcon.end();
		return res.send(200);
  });
}