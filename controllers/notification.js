exports.regist = function(req, res) {
  var reg_id = req.body.reg_id;
  var device_id = req.body.device_id;
  var type = req.body.type;
  
  if(!reg_id || !device_id || !type)
    res.json({'response' : 400, 'message' : 'Bad Request'});
  var query = "SELECT reg_id, device_id, type FROM Devices WHERE device_id = '" + device_id + "' and type = '" + type + "'";
  var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
  
  dbcon.query(query, function(err, rows) {
    var refQuery = "";
    //insert new row
    if (rows.length === 0) {
      refQuery = "INSERT INTO `Devices` " +
        "(`reg_id`, `device_id`, `type`, `updated`, `created`) "+
        "VALUES "+
        "('"+reg_id+"', '"+device_id+"', '"+type+"', NOW(), NOW());";
    } else {
      //update if device_id is different
      if (rows.reg_id !== reg_id) {
        refQuery = "UPDATE Devices SET reg_id = '" + reg_id + "', updated = NOW()" +
          " WHERE device_id = '" + device_id + "' AND type = '" + type + "'";
      } else {
        dbcon.end();
        return res.json(200, rows[0]);
      }
    }

    dbcon.query(refQuery, function(refErr, refRows) {
      dbcon.end();
      return res.json(201, refRows);
    }); 
  });
};

exports.send = function(req, res, next) {
  var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
  var query = "SELECT reg_id FROM `Devices` WHERE type = '" + req.body.type + "'";
  var limit = req.body.limit ? req.body.limit : 500;

	var GCM_msg = {
    collapse_key: Math.random() + '', // http://developer.android.com/guide/google/gcm/gcm.html#send-msg
    time_to_live: 180, // just 30 minutes
    data: {
      'message': req.body.message, // your payload data
      'url': req.body.url
    }
  };

  get_list(dbcon, req.body.api_key, query, 0, limit, GCM_msg, function cbDone() {
    res.send(200);
    return dbcon.end();
  });
};

function get_list(dbcon, api_key, origin_query, offset, limit, GCM_msg, done) {
  // get reg_ids
  var query = origin_query + " LIMIT "+offset+", "+limit+";"
  
  dbcon.query(query, function(err, rows) {
		if(err) {
			console.log(err);
			return false;
		}
		if(rows.length === 0) {
  		//no more rows
  		return done();
		} else {
  		offset += limit;
  		var reg_ids = [];
  		for(i in rows) {
    		reg_ids.push(rows[i].reg_id);
  		}

      delete GCM_msg.registration_ids;

      GCM_msg['registration_ids'] = reg_ids;
      get_list(dbcon, api_key, origin_query, offset, limit, GCM_msg, done);
      
      post_gcm(GCM_msg, api_key);
		}

		return true;
	});
}

function post_gcm(GCM_msg, api_key) {
  var request = require('request');
  request.post({
    uri: 'https://android.googleapis.com/gcm/send',
    json: GCM_msg,
    headers: {
      Authorization: 'key=' + api_key
    }
  }, function(err, response, body) {
  });
}
