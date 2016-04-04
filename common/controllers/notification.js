exports.sendNotification = function(req, res, next) {
  // SEND NOTIFICATION TO REGISTED DEVICES
  if (!req.body.appName || !req.body.apiKey || !req.body.message) {
    return res.json(400, {'message': 'mising parameter'});
  }

  var GCM_msg = {
    collapse_key: Math.random() + '', // http://developer.android.com/guide/google/gcm/gcm.html#send-msg
    time_to_live: 180, // just 30 minutes
    data: {
      'message': req.body.message, // your payload data
    }
  };

  if (req.body.url) {
    GCM_msg.data['url'] = req.body.url;
  }

  var options = {
    'Limit': 500
  };

  var key = {
    'appName': req.body.appName
  };

  send(GCM_msg, req.body.apiKey, key, options, function(err, info) {
    if (err) {
      return res.json(500, {'message': err});
    }

    return res.json(200, {'message': 'OK'});
  });
}

function sendMsg(reg_ids, apiKey, message, url, done) {
  // SEND NOTIFICATION TO REGISTED DEVICES
  if (!reg_ids || !apiKey || !message) {
    return done('bad request');
  }

  var GCM_msg = {
    collapse_key: Math.random() + '', // http://developer.android.com/guide/google/gcm/gcm.html#send-msg
    time_to_live: 180, // just 30 minutes
    data: {
      'message': message, // your payload data
    }
  };
  
  for (var idx = 0; ; idx++) {
    var targetRegIds = regIds.slice(idx * 500, (idx + 1) * 500);
    if (targetRegIds.length === 0) {
      return done(null, regIds.length);
    }
       
    GCM_msg['registration_ids'] = targetRegIds;
    post_gcm(GCM_msg, api_key); 
  }
}

function send(GCM_msg, api_key, key, options, done) {
  db.devices.query(key, options, function(err, info) {
    if (err) {
      return done('internal error', null);
    }

    if (!info.data) {
      return done(null, 'OK');
    }

    // send notification
    if (GCM_msg.registration_ids)
      delete GCM_msg.registration_ids;
    
    var regIds = [];
    for(i in info.data) {
      regIds.push(info.data[i].regId);
    }

    GCM_msg['registration_ids'] = regIds;
    post_gcm(GCM_msg, api_key);

    // check more devices
    if(!info.LastEvaluatedKey) {
      //no more rows
      return done(null, 'OK');
    } else {
      options.ExclusiveStartKey = info.LastEvaluatedKey;
      return send(GCM_msg, api_key, key, options, done);
    }
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


exports.post_gcm = post_gcm;