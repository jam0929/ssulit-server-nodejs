/*
 * services/ssulit/tok.js
 * AUTHOR : beryh
 * DATE : 2014. 3. 7
 * TOK COLLECTION
 */
var async = require('async'); 

exports.set = function(req, res) {
  // check if valid request is
  var result = {
    code: 400,
    message: 'bad request'
  };
  
  if (!req.user) {
    result.code = 401;
    result.message = 'not logged in';
    return res.json(401, result);
  }
  
  if (req.user.id !== req.params.id) {
    result.code = 401;
    result.message = 'not permitted';
    return res.json(401, result);
  }

  if (!req.body.content && !req.body.imageUrl && !req.body.thumbnail && !req.body.videoUrl) {
    result.code = 400;
    result.message = 'mising parameter';
    return res.json(400, result);
  }
  
  // make paramter
  var keyString = req.params.id + '|' + req.params.created;
  
  var ssulKey = {
    'author': req.params.id,
    'created': req.params.created
  };
  
  var created = +new Date();
  
  async.waterfall([
    function(callback) {
      // get channel
      if (req.body.channel) {
        return callback(null, req.body.channel);
      } else {
        var key = {
          'author': req.params.id,
          'created': req.params.created
        }

        db.channels.find(key, function(err, info) {
          if (err) {
            return callback(err);
          } else {
            return callback(null, info ? info.channel : null);
          }
        });
      }
    }, function(channel, callback) {
      // check if ssul exists
      var keyString = req.params.id + '|' + req.params.created;
      var ssulKey = {
        'author': req.params.id,
        'created': req.params.created
      };

      if (channel) {
        ssulKey.channel = channel;
      }
      
      db.ssuls.find(ssulKey, function(err, ssul) {
        if (err) {
          result['code'] = 500;
          return callback(err);
        } else if (!ssul) {
          result['code'] = 400;
          return callback('invalid ssul key');
        } else if (req.user.id !== ssul.author) {
          result['code'] = 401;
          return callback('not permitted');
        } else {
          return callback(null, ssul, channel);
        }
      });
    }, function(ssul, channel, callback) {
      // upload image if exists
      if (req.body.thumbnail) {
        utils.uploadImageStream(req.user.id, 's3-jumpingnuts-data', 'ssul_it_tok_' + keyString + '|' + created, 0, req.body.thumbnail, function cbUploadImage(err, info) {
          if (err) {
            result['code'] = 500;
            return callback(err);
          } else {
            req.body.imageUrl = info;
            return callback(null, ssul, channel);
          }
        });
      } else {
        return callback(null, ssul, channel);
      }
    }, function(ssul, channel, callback) {
      // make request body
      var reqBody = req.body;
      reqBody.key = keyString;
      
      delete reqBody.author;
      delete reqBody.created;
      delete reqBody.tokCreated;
      
      delete reqBody.thumbnail;
      
      var ssulBody = {
        'updated': created,
        'tokCount': '+1'
      };
      
      if (ssul.status !== 'onair') {
        ssulBody['status'] = 'onair';
      }
      
      if (reqBody.content && reqBody.content.length > 0) {
        reqBody.content = reqBody.content.toString();
      } else if (!reqBody.content && (reqBody.imageUrl || reqBody.videoUrl)) {
        delete reqBody.content;
      } else {
        return callback('invalid request');
      }
      
      return callback(null, channel, ssulBody, reqBody);
    }],
    function(err, channel, ssulBody, reqBody) {
      if (err) {
        result['message'] = err;
        return res.json(result['code'], result);
      } else {
        var ssulKey = {
          'author': req.params.id,
          'created': req.params.created
        };
        
        var key = {
          'created': created,
          'author': req.user.id,
          'expected': true
        };
        
        if (channel) {
          ssulKey.channel = channel;
        }
        
        db.ssuls.update(ssulKey, ssulBody);
        db.toks.save(key, reqBody, function(_err, tok) {
          if (_err) {
            result['code'] = 500;
            result['message'] = _err;
            return res.json(500, result);
          }
    
          result['code'] = 201;
          result['message'] = 'OK';
          result['key'] = key;
          return res.json(201, result);
        });
      }
    }
  );
}

exports.getDetail = function getDetail(req, res) {
  // GET SSUL DETAIL
  var result = {
    code: 400,
    message: 'bad request'
  };
  
  var key = {
    'author': {'S': req.params.id},
    'created': {'N': req.params.tokCreated}
  };
  
  var keyAuthor = {
    'id': {'S': req.params.id}
  };
  
  var keys = [ {'Toks': { 'Keys': [key] }}, {'Users': { 'Keys': [keyAuthor], 'AttributesToGet': ['id', 'nickname'] }} ];

  if (req.user) {
    var keyLikes = {
      'user_id': {'S': req.user.id},
      'key': {'S': 'tok|' + req.params.id + '|' + req.params.created + '|' + req.params.tokCreated}
    };
    
    keys.push({'Likes': { 'Keys': [keyLikes] }});
    
    var keyMark = {
      'user_id': {'S': req.user.id},
      'key': {'S': req.params.id + '|' + req.params.created}
    };
    
    keys.push({'Ssulit.Bookmarks': { 'Keys': [keyMark] }});
  }

  db.toks.findBatch(keys, function(err, info) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    }
    
    if (info.Toks.length === 0) {
      result['code'] = 403;
      result['message'] = 'not found';
      return res.json(403, result);
    }

    result['code'] = 200;
    result['message'] = 'OK';
    result['Tok'] = info.Toks[0] ? info.Toks[0] : {};
    result['Author'] = info.Users[0] ? info.Users[0] : {};
    result['Liked'] = [];
    result['Marked'] = info['Ssulit.Bookmarks'] ? info['Ssulit.Bookmarks'][0] : {};    
    if (req.user && info.Likes.length > 0) {
      result['Liked'].push(req.params.id + '|' + req.params.created + '|' + req.params.tokCreated);
    }
    
    return res.json(200, result);
  });
}

exports.get = function get(req, res) {
  // GET TOK LIST
  // BUILD OPTIONS FOR QUERYING
  // SET DEFAULT OPTIONS  
  var result = {
    code: 400,
    message: 'bad request'
  };
  
  var bookMark = null;
  var lastEvaluatedKey = null;
  
  if (!req.user) {
    return setLastEvaluatedKey();
  }
  
  var keyMarks = {
    'key': req.params.id + '|' + req.params.created,
    'user_id': req.user.id
  };

  db.bookmarks.find(keyMarks, function(err, info) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    } else if (info) {
      bookMark = info;
    }
    return setLastEvaluatedKey();
  });
  
  function setLastEvaluatedKey() {
    if (req.query.LastEvaluatedKey) {
      lastEvaluatedKey = JSON.parse(req.query.LastEvaluatedKey);
      return getToks();
    } else if (req.user && bookMark) {
      return getMarkedToks();
    } else {
      return getToks();
    }
  }
  
  function getMarkedToks() {
    var keyTemplate = {
      'AttributeValueList': [],
      'ComparisonOperator': ''
    };
    var key = {};
    var options = {};
    var keyString = req.params.id + '|' + req.params.created;
    var lastEvaluatedKey = {
      'prev': {
        'author': {
          'S': req.params.id
        },
        'created': {
          'N': (bookMark.position).toString()
        },
        'key': {
          'S': req.params.id + '|' + req.params.created
        }
      }, 'next': {
      'author': {
          'S': req.params.id
        },
        'created': {
          'N': (bookMark.position - 1).toString()
        },
        'key': {
          'S': req.params.id + '|' + req.params.created
        }
      }
    };

    var keyToks = JSON.parse(JSON.stringify(keyTemplate));
    keyToks['AttributeValueList'].push({'S': keyString});
    keyToks.ComparisonOperator = 'EQ';
    
    key['key'] = keyToks;
  
    options.IndexName = 'key-created-index';
    options.ScanIndexForward = false;
    options.Limit = (req.query.limit ? req.query.limit : 20) / 2;
    options.ExclusiveStartKey = lastEvaluatedKey.prev;

    db.toks.query(key, options, function(perr, pinfo) {
      if (perr) {
        result['code'] = 500;
        result['message'] = perr;
        return res.json(500, result);
      }
      
      options.ScanIndexForward = true;
      options.ExclusiveStartKey = lastEvaluatedKey.next;
      
      result['Toks'] = pinfo.data;
      db.toks.query(key, options, function(nerr, ninfo) {
        if (nerr) {
          result['code'] = 500;
          result['message'] = nerr;
          return res.json(500, result);
        }

        result['code'] = 200;
        result['message'] = 'OK';
        result['Toks'] = result['Toks'].concat(ninfo.data);
        result['Liked'] = [];
        result['Marked'] = bookMark ? {'position': bookMark.position, 'key': bookMark.key} : {};
        
        if (req.user) {
          // get like info for loggend-in users
          var keyLikes = {};
          var keyString = 'tok|' + req.params.id + '|' + req.params.created;
          
          var keyUserId = JSON.parse(JSON.stringify(keyTemplate));
          keyUserId['AttributeValueList'].push({'S': req.user.id});
          keyUserId.ComparisonOperator = 'EQ';
          keyLikes['user_id'] = keyUserId;
          
          var keyKey = JSON.parse(JSON.stringify(keyTemplate));
          keyKey['AttributeValueList'].push({'S': keyString});
          keyKey.ComparisonOperator = 'BEGINS_WITH';
          keyLikes['key'] = keyKey;
    
          db.likes.query(keyLikes, {}, function(_err, likes) {
            for (var idx in likes['data']) {
              result['Liked'].push(likes['data'][idx].key.substring(4, 50));
            }
            return res.json(200, result);
          });
        } else {
          return res.json(200, result);
        }
      });
    });
  }
  
  function getToks() {
    var keyTemplate = {
      'AttributeValueList': [],
      'ComparisonOperator': ''
    };
    var key = {};
    var options = {};
    var order = req.query.order ? req.query.order : 'created';
    var keyString = req.params.id + '|' + req.params.created;
    
    var keyToks = JSON.parse(JSON.stringify(keyTemplate));
    keyToks['AttributeValueList'].push({'S': keyString});
    keyToks.ComparisonOperator = 'EQ';
    
    key['key'] = keyToks;
  
    options.IndexName = 'key-created-index';
    var direction = (order[0] === '-') ? false : true;
    direction = (req.query.direction === 'prev') ? !direction : direction;
    
    options.ScanIndexForward = direction;
    
    options.Limit = req.query.limit ? req.query.limit : 20;
  
    if (lastEvaluatedKey) {
      options.ExclusiveStartKey = lastEvaluatedKey;
    }

    db.toks.query(key, options, function(err, info) {
      if (err) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      }
      
      if (info.LastEvaluatedKey) {
        result['LastEvaluatedKey'] = info.LastEvaluatedKey;
      } else if (order === 'created') {
        var current = +new Date();
        result['LastEvaluatedKey'] = {
          'author': {
              'S': req.params.id
          },
          'created': {
              'N': current.toString()
          },
          'key': {
              'S': req.params.id + '|' + req.params.created
          }
        };
      }
      
      result['code'] = 200;
      result['message'] = 'OK';
      result['Toks'] = info.data;
      result['Liked'] = [];
      result['Marked'] = bookMark ? {'position': bookMark.position, 'key': bookMark.key} : {};
      
      if (req.user) {
        // get like info for loggend-in users
        var keyLikes = {};
        var keyString = 'tok|' + req.params.id + '|' + req.params.created;
        
        var keyUserId = JSON.parse(JSON.stringify(keyTemplate));
        keyUserId['AttributeValueList'].push({'S': req.user.id});
        keyUserId.ComparisonOperator = 'EQ';
        keyLikes['user_id'] = keyUserId;
        
        var keyKey = JSON.parse(JSON.stringify(keyTemplate));
        keyKey['AttributeValueList'].push({'S': keyString});
        keyKey.ComparisonOperator = 'BEGINS_WITH';
        keyLikes['key'] = keyKey;
  
        db.likes.query(keyLikes, {}, function(_err, likes) {
          for (var idx in likes['data']) {
            result['Liked'].push(likes['data'][idx].key.substring(4, 50));
          }
          return res.json(200, result);
        });
      } else {
        return res.json(200, result);
      }
    });
  }
}

exports.update = function update(req, res) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  var reqBody = {};
  for (var prop in req.body) {
    reqBody[prop] = req.body[prop];
  }
  
  var key = {
    'created': req.params.tokCreated,
    'author': req.params.id,
    'expected': true
  };
    
  delete reqBody.author;
  delete reqBody.created;
  delete reqBody.tokCreated;
  
  if (reqBody.content && (!req.user || req.user.id !== author.id) ) {
    result['code'] = 401;
    result['message'] = 'not permitted';
    return res.json(401, result);
  }

  db.toks.update(key, reqBody, function(err, tok) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    }

    result['code'] = 201;
    result['message'] = 'OK';
    result['tok'] = tok;
    return res.json(201, result);
  });  
}

exports.del = function(req, res) {
  var result = {
    code: 400,
    message: 'bad request'
  };
  
  if (!req.user || (req.params.id !== req.user.id)) {
    result.code = 401;
    result.message = 'not logged in';
    return res.json(401, result);
  }
  
  var key = {
    'author': req.user.id,
    'created': req.params.created,
    'expected': true
  };
  
  async.waterfall([
    function(callback) {
      // get channel
      if (req.body.channel) {
        return callback(null, req.body.channel);
      } else {
        db.channels.find(key, function(err, info) {
          if (err) {
            return callback(err);
          } else {
            return callback(null, info ? info.channel : null);
          }
        });
      }
    }
  ], function(err, channel) {
    if (err) {
      result['code'] = 400;
      result['message'] = err;
      
      return res.json(400, result);
    } else {
      if (channel) {
        key.channel = channel;
      }
      
      db.ssuls.update(key, {'tokCount': '-1'});
      
      key.created = req.params.tokCreated;
      delete key.expected;
      delete key.channel;
      
      db.toks.delete(key);
      
      result['code'] = 202;
      result['message'] = 'Accepted';
      return res.json(202, result);
    }
  });
}

exports.share = function share(req, res) {
  var result = {
    'code': 202,
    message: 'Accepted'
  }

  var author = req.params.id;
  var created = req.params.created;
  
  var key = {
    'author': req.params.id,
    'created': req.params.tokCreated,
    'expected': true
  };
  
  db.toks.update(key, {'shareCount': '+1'});

  result['code'] = 202;
  result['message'] = 'Accepted';
  return res.json(202, result);
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
    'author': req.params.id,
    'created': req.params.tokCreated
  };
  
  db.toks.find(key, function(err, info) {
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
      'key': 'tok|' + info.author + '|' + req.params.created + '|' + info.created,
      'expected': true
    };
    var created = +new Date();
    
    db.likes.save(likeKey, {}, function(_err, _info) {
      if (_err) {
        result['code'] = 500;
        result['message'] = _err;
        return res.json(500, result);
      }
      
      var tokKey = {
        'author': info.author,
        'created': info.created,
        'expected': true
      }
      
      var tokBody = {
        'likeCount': '+1'
      };
      
      db.toks.update(tokKey, tokBody);
      
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
  
  if (!req.params.id || !req.params.tokCreated) {
    result['code'] = 400;
    result['message'] = 'bad request';
    return res.json(400, result);
  }
  
  var key = {
    'author': req.params.id,
    'created': req.params.tokCreated
  };
  
  db.toks.find(key, function(err, info) {
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
      'key': 'tok|' + info.author + '|' + req.params.created + '|' + info.created
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
      
      var tokKey = {
        'author': info.author,
        'created': info.created,
        'expected': true
      }
      
      var tokBody = {
        'likeCount': '-1'
      };
      
      db.toks.update(tokKey, tokBody);
      
      result['code'] = 200;
      result['message'] = 'OK';
      return res.json(200, result);
    });
  });
}

// SET BOOKMARK - AUTHOR|SSUL|TOK
exports.mark = function(req, res) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  if (!req.user) {
    result['code'] = 401;
    result['message'] = 'not logged in';
    return res.json(401, result);
  }
  
  var keyString = req.params.id + '|' + req.params.created;
    
  var key = {
    'key': keyString,
    'user_id': req.user.id,
    'expected': true
  };
  
  reqBody = req.body;
  delete reqBody.key;
  delete reqBody.user_id;
  delete reqBody.action;
  delete reqBody.author;
  delete reqBody.created;
  delete reqBody.tokCreated;
  
  reqBody.position = req.params.tokCreated;
  
  db.bookmarks.update(key, reqBody, function(err, info) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    } 
          
    if (global.redisClient) {
      db.users.find(req.params.id, function(uerr, author) {
        // action_type:action_id:target_key
        var actionKey = 'mark:' + req.user.id + ':' + req.params.id + '|' + req.params.created;
        global.redisClient.get(actionKey, function(err, reply) {
          if (!err && !reply && author['ssul.it']) {
            var message = req.user.nickname ? req.user.nickname + '님이 당신의 썰에 책갈피를 꽂았습니다!' : '누군가 당신의 썰에 책갈피를 꽂았습니다!';
            utils.sendMsg([author['ssul.it']], 'AIzaSyCk9ozGirgmZ3Iamgfoht5E3GUb2lLwdbY', message, req.body.url ? req.body.url : 'http://ssul.it');
            // cannot send same issue for 2 hours
            global.redisClient.set(actionKey, +new Date());
            global.redisClient.expire(actionKey, 2 * 60 * 60);  // in second
          }
        });
      });
    }
    
    result['code'] = 200;
    result['message'] = 'OK';
    return res.json(200, result);
  });
}

// SET BOOKMARK - AUTHOR|SSUL|TOK
exports.unmark = function(req, res) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  if (!req.user) {
    result['code'] = 401;
    result['message'] = 'not logged in';
    return res.json(401, result);
  }
  
  var keyString = req.params.id + '|' + req.params.created;
    
  var key = {
    'key': keyString,
    'user_id': req.user.id
  };
  
  db.bookmarks.delete(key, function(err, info) {
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