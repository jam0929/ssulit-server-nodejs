/*
 * comments.js
 * AUTHOR : beryh
 * DATE : 2014. 1. 13
 * COMMENT COLLECTION
*/

// GET COMMENT
exports.get = function(req, res, next) {
  var result = {
    code: 400,
    message: 'bad request'
  };
  
  // check required parameters
  if (!req.key) {
    result['code'] = 400;
    result['message'] = 'mising parameter';
    return res.json(400, result);
  }

  if (req.query.filter) {
    var filter = {};
    try {
      var _filter = JSON.parse(req.query.filter);
      for (var prop in _filter) {
        filter.field = prop;
        filter.value = _filter[prop];
      }
    } catch (e) {
      result['code'] = 400;
      result['message'] = 'bad request';
      return res.json(400, result);
    }
  }
  
  var keyTemplate = {
    'AttributeValueList': [],
    'ComparisonOperator': ''
  };
  
  var key = {};
  var options = {};

  // set query key(url)
  var keyUrl = JSON.parse(JSON.stringify(keyTemplate));
  keyUrl['AttributeValueList'].push({'S': req.key});
  keyUrl.ComparisonOperator = 'EQ';
  
  key['key'] = keyUrl;
  
  var limit = (req.query.limit ? req.query.limit : 20);
  options.Limit = limit  * (filter ? 10 : 1);

  if (req.query.LastEvaluatedKey) {
    options.ExclusiveStartKey = JSON.parse(req.query.LastEvaluatedKey);
  }
  
  var order = req.query.order ? ((req.query.order === 'created') ? true : false) : false;  
  options.ScanIndexForward = order;
  
  var comments = [];
  filteringQuery(key, options);

  function filteringQuery(key, options) {
    db.comments.query(key, options, function(err, info) {
      if (err) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      }
      if (!filter) {
        result['code'] = 200;
        result['message'] = 'OK';
        result['Comments'] = info.data;

        if (info.LastEvaluatedKey) {
          result['LastEvaluatedKey'] = info.LastEvaluatedKey;
        } else {
          var current = +new Date();
          result['LastEvaluatedKey'] = {'key': {'S': req.key}, 'created': {'N': order ? current.toString() : (0).toString()}};
        }
        
        return res.json(200, result);
      } else {
        for (var idx in info.data) {
          if (info.data[idx][filter.field] && (info.data[idx][filter.field] === filter.value)) {
            comments.push(info.data[idx]);          
            if (comments.length >= limit) {
              var lastEvaluatedKey = {'key': {'S': req.key}, 'created': {'N': info.data[idx].created}};

              result['code'] = 200;
              result['message'] = 'OK';
              result['Comments'] = comments;
              result['LastEvaluatedKey'] = lastEvaluatedKey;
              return res.json(200, result);
            }
          }
        }

        if (info.LastEvaluatedKey) {
          options.ExclusiveStartKey = info.LastEvaluatedKey;
          return filteringQuery(key, options);
        } else {
          var current = +new Date();
          result['code'] = 200;
          result['message'] = 'OK';
          result['Comments'] = comments;
          result['LastEvaluatedKey'] = {'key': {'S': req.key}, 'created': {'N': order ? current.toString() : (0).toString()}};
          return res.json(200, result);
        }
      }
    });
  }
}

// SET COMMENT (ADD/UPDATE)
exports.set = function(req, res, next) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  if (!req.key || !req.body.content) {
    result['code'] = 400;
    result['message'] = 'mising parameter';
    return res.json(400, result);
  }
  
  var created = +new Date();
  
  var content = req.body.content;
  content = content.replace(/\r\n/gi, "\n");
  content = content.replace(/\n/gi, "<br />");
  content = content.replace(/\"/gi, '\\"');
  content = content.replace(/\'/gi, "\\'");
  
  var key = {
    'created': created,
    'key': req.key
  };

  var reqBody = req.body;
  reqBody.key = req.key;
  reqBody.content = content;
  reqBody.author = req.user ? req.user.id : '0';
  reqBody.nickname = req.user ? req.user.nickname : 'anonymous';

  if (req.params.id) {
    //update
    delete reqBody.key;
    delete reqBody.created;
    
    db.comments.update(key, reqBody, function(err, info) {
      if (err) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      }
      
      result['code'] = 200;
      result['message'] = 'OK';
      result['Comment'] = info.data;
      return res.json(200, info);
    });
  } else {
    //insert
    db.comments.save(key, reqBody, function(err, info) {
      if (err) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      }
  
      result['code'] = 201;
      result['message'] = 'OK';
      result['key'] = key;
      return res.json(201, result);
    });
  }
}

// DEL COMMENT
exports.del = function(req, res, next) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  if (!req.user) {
    result['code'] = 401;
    result['message'] = 'not logged in';
    return res.json(401, result);
  }
  
  var key = {
    'key': req.key,
    'created': req.params.created
  };

  db.comments.delete(key, function(err, info) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    }

    result['code'] = 200;
    result['message'] = 'OK';
    return res.json(200, result);
  });
}

// CONTROLLER FOR LIKE ACTION
exports.like = function(req, res) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  if (!req.user) {
    result['code'] = 401;
    result['message'] = 'not logged in';
    return res.json(401, result);
  }
  
  var key = {
    'key': req.key,
    'created': req.params.created
  };
  
  db.comments.find(key, function(err, info) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    } else if (!info) {
      result['code'] = 404;
      result['message'] = 'not found';
      return res.json(404, result);
    }

    var likeKey = {
      'user_id': req.user.id,
      'key': 'comment|' + req.key + '|' + info.created,
      'expected': true
    };
    var created = +new Date();
    db.likes.save(likeKey, {}, function(_err, _info) {
      if (_err) {
        result['code'] = 500;
        result['message'] = _err;
        return res.json(500, result);
      }
      
      var commentKey = {
        'key': req.key,
        'created': info.created,
        'expected': true
      }
      
      var commentBody = {
        'likeCount': '+1'
      };
      
      db.comments.update(commentKey, commentBody);
      
      result['code'] = 200;
      result['message'] = 'OK';
      return res.json(200, result);
    });
  });
}

// CONTROLLER FOR UNLIKE ACTION
exports.unlike = function(req, res) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  if (!req.user) {
    result['code'] = 401;
    result['message'] = 'not logged in';
    return res.json(401, result);
  }

  var key = {
    'key': req.key,
    'created': req.params.created
  };
  
  db.comments.find(key, function(err, info) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    } else if (!info) {
      result['code'] = 404;
      result['message'] = 'not found';
      return res.json(404, result);
    }
    
    var likeKey = {
      'user_id': req.user.id,
      'key': 'comment|' + info.key + '|' + info.created
    };
    var created = +new Date();
    db.likes.delete(likeKey, function(_err, _info) {
      if (_err) {
        result['code'] = 500;
        result['message'] = _err;
        return res.json(500, result);
      } else if (!_info.user_id) {
        result['code'] = 403;
        result['message'] = 'not found';
        return res.json(403, result);
      }
      
      var commentKey = {
        'key': req.key,
        'created': info.created,
        'expected': true
      }
      
      var commentBody = {
        'likeCount': '-1'
      };
      
      db.comments.update(commentKey, commentBody);
      
      result['code'] = 200;
      result['message'] = 'OK';
      return res.json(200, result);
    });
  });
}

exports.removeOverhead = function(req, res, next) {
  var result = {
    code: 400,
    message: 'bad request'
  };
  
  var key = req.query.key ? req.query.key : (req.body.key ? req.body.key : req.params.key);
  if (!key) {
    return res.json(400, result);
  }

  req.key = key.replace(/http[s]*:\/\/[w]*\.*/, '');
  next();
}