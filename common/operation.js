var notice = {
  get: function(req, res, next) {
    var result = {
      code: 400,
      message: 'bad request'
    };
    
    var keyTemplate = {
      'AttributeValueList': [],
      'ComparisonOperator': ''
    };
    
    var dev = req.query.option ? (req.query.option === 'dev') : false;
    
    var key = {};
  
    // set query key(url)
    var keyNotice = JSON.parse(JSON.stringify(keyTemplate));
    keyNotice['AttributeValueList'].push({'S': req.params.service});
    keyNotice.ComparisonOperator = 'EQ';
    
    key['key'] = keyNotice;
  
    db.notices.query(key, {}, function(err, notices) {
      if (err) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      }
    
      result['Notices'] = [];
      for (var idx in notices.data) {
        if (notices.data[idx].order > 0 || dev) {
          result['Notices'].push(notices.data[idx]);
        }
      }
      
      result['code'] = 200;
      result['message'] = 'OK';
      return res.json(200, result);
    });
  },
  set: function(req, res, next) {
    var result = {
      code: 400,
      message: 'bad request'
    };
    
    var current = +new Date();
    var key = {
      'key': req.params.service,
      'created': current.toString()
    };
    
    db.notices.save(key, req.body, function(err, notices) {
      if (err) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      }
      
      result['code'] = 201;
      result['message'] = 'created';
      return res.json(201, result);
    });
  }
}

var version = {
  get: function(req, res, next) {
    var result = {
      code: 400,
      message: 'bad request'
    };
    
    if (!req.query.version) {
      result['code'] = 400;
      result['message'] = 'bad request';
      return res.json(400, result);
    }
    var version = req.query.version;
    var key = {
      'key': req.params.service,
      'version': version
    };
    
    // check version
    db.versions.find(key, function(err, info) {
      if (err) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      }
      
      // check if exists
      if (info) {
        result['code'] = 200;
        result['message'] = 'OK';
        result['Version'] = info;
        return res.json(200, result);
      } else {
        db.versions.save(key, {'isValid': 'Y'}, function(err, version) {
          if (err) {
            result['code'] = 500;
            result['message'] = err;
            return res.json(500, result);
          }
          
          result['code'] = 201;
          result['message'] = 'created';
          result['Version'] = version;
          return res.json(201, result);
        });
      }
    });
  }
}

exports.notice = notice;
exports.version = version;
