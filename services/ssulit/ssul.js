/*
 * services/ssulit/ssul.js
 * AUTHOR : beryh
 * DATE : 2014. 3. 4
 * SSUL COLLECTION
 */

// USE TO CONCURRENT VIEWING COUNT
var viewCounts = {};
var prevViewCounts = {};

var channels = [
  'fanfic',
  'humor',
  'information',
  'livestream',
  'life',
  'love',
  'emotion',
  'horror',
  'etc'
];

var async = require('async');

setInterval(function(){
  for(var hash in viewCounts) {
    var id = hash.split('|');
    var key = {
      author: id[0],
      created: id[1],
      expected: true
    };

    if (id.length > 2) {
      key.channel = id[2];
    }

    db.ssuls.update(key, {'viewCount': viewCounts[hash]});
    prevViewCounts[hash] = viewCounts[hash];

    if (viewCounts[hash] === 0) {
      delete prevViewCounts[hash];
      delete viewCounts[hash];
    } else {
      viewCounts[hash] = 0;
    }
  }
  //db.ssuls.update(key, reqBody);
}, 10 * 1000);

exports.getDetail = function getDetail(req, res) {
  // GET SSUL DETAIL
  var result = {
    code: 400,
    message: 'bad request'
  };

  // make query key
  var key = {
    'author': req.params.id,
    'created': req.params.created
  }

  async.waterfall([
    function(callback) {
      // get channel
      if (req.query.channel === 'etc') {
        return callback(null, null);
      } else if (req.query.channel) {
        return callback(null, req.query.channel);
      } else {
        db.channels.find(key, function(err, info) {
          if (err) {
            return callback(err);
          } else {
            return callback(null, info ? info.channel : null);
          }
        });
      }
    }, function(channel, callback) {
      if (channel && channels.indexOf(channel) < 0) {
        return callback('invalid channel');
      }

      // make batch
      var keySsul = {
        'author': {'S': key.author},
        'created': {'N': key.created}
      };

      var keyAuthor = {
        'id': {'S': req.params.id}
      };

      var target = 'Ssuls' + (channel ? '_' + channel : '');
      var tmp = {};
      var ssuls = {
        'Keys': [keySsul]
      };
      tmp[target] = ssuls;

      var keys = [{'Users': { 'Keys': [keyAuthor], 'AttributesToGet': ['id', 'nickname'] }}];
      keys.push(tmp);

      if (req.user) {
        var keyLikes = {
          'user_id': {'S': req.user.id},
          'key': {'S': 'ssul|' + req.params.id + '|' + req.params.created}
        };

        keys.push({'Likes': { 'Keys': [keyLikes] }});
      }

      db.ssuls.findBatch(keys, function(err, info) {
        if (err) {
          return callback(err);
        }

        if (!info[target] || info[target].length === 0) {
          return callback('not found');
        }

        return callback(null, channel, info);
      });
    }
  ], function(err, channel, info) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    } else {
      var target = 'Ssuls' + (channel ? '_' + channel : '');

      result['code'] = 200;
      result['message'] = 'OK';
      result['Ssul'] = info[target][0] ? info[target][0] : {};
      result['Author'] = info.Users[0] ? info.Users[0] : {};
      result['Liked'] = [];
      if (req.user && info.Likes.length > 0) {
        result['Liked'].push(req.params.id + '|' + req.params.created);
      }

      key.expected = true;

      if (channel) {
        key.channel = req.query.channel;
      }

      db.ssuls.update(key, {'totalViewCount': '+1'});
      return res.json(200, result);
    }
  });
}

exports.getMine = function getMine(req, res) {
  // GET SSUL DETAIL
  var result = {
    code: 400,
    message: 'bad request'
  };

  // check request validation
  if (!req.user) {
    result['code'] = 401;
    result['message'] = 'not allowed';

    return res.json(401, result);
  }

  async.waterfall([
    function(callback) {
      // get ssuls in various channel
      var keyTemplate = {
        'AttributeValueList': [],
        'ComparisonOperator': ''
      };

      var keyAuthor = JSON.parse(JSON.stringify(keyTemplate));
      keyAuthor['AttributeValueList'].push({'S': req.user.id});
      keyAuthor.ComparisonOperator = 'EQ';

      var key = {
        'author': keyAuthor
      };

      var options = {};
      db.channels.query(key, options, function(err, info) {
        if (err) {
          return callback(err);
        } else {
          return callback(null, info.data);
        }
      });
    }, function(ssuls, callback) {
      // get ssuls in etc channel
      var keyTemplate = {
        'AttributeValueList': [],
        'ComparisonOperator': ''
      };

      var keyAuthor = JSON.parse(JSON.stringify(keyTemplate));
      keyAuthor['AttributeValueList'].push({'S': req.user.id});
      keyAuthor.ComparisonOperator = 'EQ';

      var key = {
        'author': keyAuthor
      };

      var options = {};
      db.ssuls.query(key, options, function(err, info) {
        if (err) {
          return callback(err);
        } else {
          ssuls = ssuls.concat(info.data);
          return callback(null, ssuls);
        }
      });
    }, function(ssuls, callback) {
      var tempKey = {};

      for (var idx in ssuls) {
        var channel = ssuls[idx].channel === 'etc' ? null : ssuls[idx].channel;
        var tableName = 'Ssuls' + (channel ? '_' + channel : '');
        var keyBatch = {
          'author': {'S': ssuls[idx].author},
          'created': {'N': ssuls[idx].created}
        };

        if (tempKey[tableName]) {
          tempKey[tableName].push(keyBatch);
        } else {
          tempKey[tableName] = [keyBatch];
        }
      }

      var keys = [];
      for (var prop in tempKey) {
        var tmp = {};
        tmp[prop] = {
          'Keys': tempKey[prop]
        };
        keys.push(tmp);
      }

      var me = {
        'Users': {
          'Keys': [ {'id': {'S': req.user.id}} ],
          'AttributesToGet': ['id', 'nickname']
        }
      };

      keys.push(me);

      db.ssuls.findBatch(keys, function(err, data) {
        if (err) {
          return callback(err);
        } else {
          return callback(null, data);
        }
      });
    }
  ], function(err, data) {
    if (err) {
      result['code'] = 400;
      result['message'] = err;
      return res.json(400, result);
    } else {
      var authorInfo = {};
      for (var idx in data.Users) {
        authorInfo[data.Users[idx].id] = data.Users[idx].nickname;
      }

      delete data.Users;

      var ssuls = [];
      for (var prop in data) {
        for (var idx in data[prop]) {
          ssuls.push(data[prop][idx]);
        }
      }

      result['code'] = 200;
      result['message'] = 'OK';
      result['Ssuls'] = ssuls;
      result['Authors'] = authorInfo;
      return res.json(200, result);
    }
  });
}

exports.get = function get(req, res) {
  // GET SSUL LIST
  // BUILD OPTIONS FOR QUERYING
  // SET DEFAULT OPTIONS
  var result = {
    code: 400,
    message: 'bad request'
  };

  var channel = null;

  var status = req.query.status ? req.query.status : 'onair';
  var order = req.query.order ? req.query.order : 'trends';

  var keyTemplate = {
    'AttributeValueList': [],
    'ComparisonOperator': ''
  };

  var key = {};
  var options = {};

  if (req.params.id) {
    var author = req.params.id === 'me' ? (req.user ? req.user.id : null) : req.params.id;
    if (!author) {
      result['code'] = 401;
      result['message'] = 'not logged in';
      return res.json(401, result);
    }

    var keyAuthor = JSON.parse(JSON.stringify(keyTemplate));
    keyAuthor['AttributeValueList'].push({'S': author});
    keyAuthor.ComparisonOperator = 'EQ';

    key['author'] = keyAuthor;
    options.IndexName = '';
  } else {
    var keyStatus = JSON.parse(JSON.stringify(keyTemplate));
    keyStatus['AttributeValueList'].push({'S': status});
    keyStatus.ComparisonOperator = 'EQ';

    key['status'] = keyStatus;
    options.IndexName = 'status-';
  }

  switch (order) {
    case 'trends':
      var keyViewCount = JSON.parse(JSON.stringify(keyTemplate));
      keyViewCount['AttributeValueList'].push({'N': '0'});
      keyViewCount.ComparisonOperator = 'GE';

      key['viewCount'] = keyViewCount;

      options.IndexName = options.IndexName + 'viewCount-index';
      options.ScanIndexForward = false;
      break;
    case 'best':
      var keyTotalViewCount = JSON.parse(JSON.stringify(keyTemplate));
      keyTotalViewCount['AttributeValueList'].push({'N': '0'});
      keyTotalViewCount.ComparisonOperator = 'GE';

      key['totalViewCount'] = keyTotalViewCount;

      options.IndexName = options.IndexName + 'totalViewCount-index';
      options.ScanIndexForward = false;
      break;
    case 'new':
    default:
      options.IndexName = options.IndexName + 'updated-index';

      options.ScanIndexForward = false;
      break;
  }

  options.Limit = req.query.limit ? req.query.limit : 20;
  if (req.query.LastEvaluatedKey) {
    options.ExclusiveStartKey = JSON.parse(req.query.LastEvaluatedKey);
  }
  options.AttributesToGet = ['author', 'created'];
  options.origin = true;

  if (req.query.channel && req.query.channel !== 'etc') {
    channel = req.query.channel;
    key.channel = channel;
  }

  db.ssuls.query(key, options, function(err, data) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    }

    var lastKey = null;

    if (data.LastEvaluatedKey) {
      result['LastEvaluatedKey'] = data.LastEvaluatedKey;
    }

    if (utils.isEmpty(data.Items)) {
      result['code'] = 204;
      result['message'] = 'OK';
      return res.json(204, result);
    }

    var target = 'Ssuls' + (channel ? '_' + channel : '');
    var tmp = {};
    var ssuls = {
      'Keys': data.Items
    };
    tmp[target] = ssuls;

    var keys = [];
    keys.push(tmp);

    var authorList = [];
    for (var prop in data.Items) {
      if (authorList.indexOf(data.Items[prop].author['S']) < 0) {
        authorList.push(data.Items[prop].author['S']);
      }
    }

    var authorKey = [];
    for (var idx in authorList) {
      authorKey.push({'id': {'S': authorList[idx]}});
    }

    keys.push({'Users': {'AttributesToGet': ['id', 'nickname'], 'Keys': authorKey}});

    db.ssuls.findBatch(keys, function(_err, _data) {
      if (_err) {
        result['code'] = 500;
        result['message'] = _err;
        return res.json(500, result);
      }

      var authorInfo = {};
      for (var idx in _data.Users) {
        authorInfo[_data.Users[idx].id] = _data.Users[idx].nickname;
      }

      result['code'] = 200;
      result['message'] = 'OK';
      result['Ssuls'] = _data[target];
      result['Authors'] = authorInfo;
      return res.json(200, result);
    });
  });
}

exports.set = function(req, res) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  if (!req.user) {
    result.code = 401;
    result.message = 'not logged in';
    return res.json(401, result);
  }

  if (req.params.created && (req.params.id !== req.user.id && !req.user.admin)) {
    result.code = 401;
    result.message = 'not permmited';
    return res.json(401, result);
  }

  if (!req.params.created && (!req.body.title || !req.body.description)) {
    result.code = 400;
    result.message = 'mising parameter';
    return res.json(400, result);
  }

  var created = +new Date();

  async.waterfall([
    function(callback) {
      // get channel
      if (!req.params.created) {
        // create new ssul
        return callback(null, req.body.channel === 'etc' ? null : req.body.channel);
      } else {
        // modify old ssul
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
      // upload image
      if (req.files && req.files.images) {
        var images = {};

        images['images'] = Array.isArray(req.files.images) ? req.files.images: [req.files.images];
        if (req.body.thumbnails) {
          images['thumbnails'] = Array.isArray(req.body.thumbnails) ? req.body.thumbnails : [req.body.thumbnails];
        }

        if (req.body.icons) {
          images['icons'] = Array.isArray(req.body.icons) ? req.body.icons : [req.body.icons];
        }

        var results = {};
        var key = +new Date();
        var uploadFailed = false;

        for(var prop in images) {
          results[prop] = [];

          for(var idx in images[prop]) {
            (function(type) {
              var fname = (type === 'thumbnails' || type === 'icons') ? 'uploadImageStream' : 'uploadImage';
              utils[fname](req.user.id, 's3-jumpingnuts-data', 'ssul_it_'+type+'_'+created, idx, images[type][idx],
                function cbUploadImage(err, info) {
                if (err) {
                  uploadFailed = true;
                }
                results[type].push(info);

                if (results[type].length === images[type].length) {
                  if (uploadFailed) {
                    return callback('upload failed');
                  } else {
                    return uploadCheck();
                  }
                }
              });
            })(prop)
          }

          function uploadCheck() {
            var done = true;

            for(var prop in images) {
              if (results[prop].length !== images[prop].length) {
                done = false;
              }
            }

            if (done) {
              return callback(null, channel, results);
            }
          }
        }
      } else {
        return callback(null, channel, null);
      }
    }, function(channel, images, callback) {
      if (!req.params.created || req.body.channel === (channel || 'etc')) {
        return callback(null, channel, images);
      } else if (req.body.channel && req.body.channel !== channel) {
        // move ssul into another channel
        var key = {
          'author': req.params.id,
          'created': req.params.created
        };

        if (channel) {
          key.channel = channel;
        }

        db.ssuls.find(key, function(ferr, oldssul) {
          if (ferr) {
            return callback(ferr);
          } else if (!oldssul) {
            return callback('cannot find your ssul');
          } else {
            // remove old one
            db.ssuls.delete(key);

            key.channel = req.body.channel === 'etc' ? null : req.body.channel;
            delete oldssul.author;
            delete oldssul.created;

            db.ssuls.save(key, oldssul, function(serr, newssul) {
              if (serr) {
                return callback(serr);
              }
              // move meta-data
              delete key.channel;
              if (req.body.channel === 'etc') {
                db.channels.delete(key);
              } else {
                db.channels.update(key, {'channel': req.body.channel});
              }

              return callback(null, req.body.channel === 'etc' ? null : req.body.channel, images);
            });
          }
        });
      } else {
        return callback(null, channel, images);
      }
    }, function(channel, images, callback) {
      var reqBody = req.body;
      delete reqBody.viewCount;
      delete reqBody.totalViewCount;
      delete reqBody.author;
      delete reqBody.created;
      delete reqBody.thumbnails;
      delete reqBody.icons;
      if (req.params.created) {
        // update
        var key = {
          'created': req.params.created,
          'author': req.params.id,
          'expected': true
        };

        for (var prop in images) {
          reqBody[prop] = images[prop];
        }

        reqBody['updated'] = +new Date();
        if (reqBody['update']) {
          // images
          // thumbnails
          // icons
          var updateBody = JSON.parse(reqBody['update']);
          for (var prop in updateBody) {
            if (prop === 'deleteItem') {
              for (var type in updateBody[prop]) {
                for (var idx in updateBody[prop][type]) {
                  utils.deleteItem('s3-jumpingnuts-data', updateBody[prop][type][idx]);
                }
              }
            } else {
              reqBody['=' + prop] = images ? updateBody[prop].concat(images[prop]) : updateBody[prop];

              if (reqBody['=' + prop].length === 0) {
                reqBody['-' + prop] = Array.isArray(updateBody['deleteItem'][prop]) ? updateBody['deleteItem'][prop]: [updateBody['deleteItem'][prop]];
                delete reqBody['=' + prop];
              }
            }
          }

          delete reqBody['update'];
        }

        if (reqBody['tags']) {
          reqBody['=tags'] = Array.isArray(reqBody['tags']) ? reqBody['tags']: [reqBody['tags']];
          delete reqBody['tags'];
        }

        if (channel) {
          key.channel = channel;
        }

        reqBody.ReturnValues = 'ALL_NEW';
        db.ssuls.update(key, reqBody, function(err, info) {
          if (err) {
            return callback(err);
          } else {
            return callback(null, channel, key, info);
          }
        });
      } else {
        var key = {
          'created': created,
          'author': req.user.id
        };

        // ADD NEW ARTICLE
        reqBody['viewCount'] = 0;  // TREND
        reqBody['totalViewCount'] = 0;    // HOT
        reqBody['status'] = req.body.status ? req.body.status : 'ready';
        reqBody['updated'] = created;

        for (var prop in images) {
          reqBody[prop] = images[prop];
        }

        if (channel) {
          key.channel = channel;
        }

        db.ssuls.save(key, reqBody, function(err, info) {
          if (err) {
            return callback(err);
          }

          if (channel) {
            db.channels.save(key, {'channel': channel});
          }
          return callback(null, channel, key, null);
        });
      }
    }
  ], function(err, channel, key, info) {
    if (err) {
      result['code'] = 400;
      result['message'] = err;
      return res.json(400, result);
    } else {
      result['code'] = 200;
      result['message'] = 'OK';
      result['key'] = key;
      if (info) {
        result['updated'] = info;
      }

      return res.json(200, result);
    }
  });
}

exports.del = function(req, res) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  if (!req.user) {
    result.code = 401;
    result.message = 'not logged in';
    return res.json(401, result);
  }

  if (req.params.id !== req.user.id && !req.user.admin) {
    result.code = 401;
    result.message = 'not permitted';
    return res.json(401, result);
  }

  var key = {
    'author': req.params.id,
    'created': req.params.created
  };

  async.waterfall([
    function(callback) {
      // get channel
      if (req.query.channel === 'etc') {
        return callback(null, null);
      } else if (req.body.channel) {
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
    }, function(channel, callback) {
      // delete ssul
      key.channel = channel;
      db.ssuls.delete(key, function(err, info) {
        if (err) {
          return callback(err);
        } else {
          return callback(null, channel);
        }
      });
    }, function(channel, callback) {
      db.channels.delete(key, function(err, info) {
        if (err) {
          return callback(err);
        } else {
          return callback(null, channel);
        }
      });
    }
  ], function(err, channel) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    } else {
      // remove associated toks
      var keyTemplate = {
        'AttributeValueList': [],
        'ComparisonOperator': ''
      };

      var queryKey = {};
      var options = {};

      var keyToks = JSON.parse(JSON.stringify(keyTemplate));
      keyToks['AttributeValueList'].push({'S': req.user.id + '|' + req.params.created});
      keyToks.ComparisonOperator = 'EQ';
      queryKey['key'] = keyToks;
      options.IndexName = 'key-created-index';

      db.toks.query(queryKey, options, function(_err, _info) {
        var tokKey = {};
        for (var idx in _info.data) {
          tokKey['author'] = _info.data[idx].author;
          tokKey['created'] = _info.data[idx].created;

          db.toks.delete(tokKey);
        }
      });
    }

    result['code'] = 202;
    result['message'] = 'OK';
    res.json(202, result);
  });
}

exports.share = function share(req, res) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  var key = {
    'author': req.params.id,
    'created': req.params.created,
    'expected': true
  };

  async.waterfall([
    function(callback) {
      // get channel
      if (req.query.channel === 'etc') {
        return callback(null, null);
      } else if (req.body.channel) {
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
    }, function(channel, callback) {
      if (channel && channels.indexOf(channel) < 0) {
        return callback('invalid channel');
      } else {
        key.channel = channel;
        db.ssuls.update(key, {'shareCount': '+1'});
        return callback(null);
      }
    }
  ], function(err) {
    if (err) {
      result['code'] = 400;
      result['message'] = err;

      return res.json(400, result);
    } else {
      result['code'] = 202;
      result['message'] = 'Accepted';

      return res.json(202, result);
    }
  });
}

exports.alive = function alive(req, res) {
  var result = {
    'code': 202,
    message: 'Accepted'
  }

  var key = req.params.id + '|' + req.params.created;
  if (req.body.channel) {
    key = key + '|' + req.body.channel;
  }

  viewCounts[key] = viewCounts[key] ? viewCounts[key] + 1 : 1;

  result['viewCount'] = prevViewCounts[key] ? prevViewCounts[key] : 0;

  return res.json(202, result);
}

// CONTROLLER FOR LIKE ACTION
exports.like = exports.unlike = function(req, res) {
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
    'created': req.params.created
  };

  async.waterfall([
    function(callback) {
      // get channel
      if (req.query.channel === 'etc') {
        return callback(null, null);
      } else if (req.body.channel) {
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
    }, function(channel, callback) {
      if (channel && channels.indexOf(channel) < 0) {
        return callback('invalid channel');
      } else {
        key.channel = channel;
        db.ssuls.find(key, function(err, ssul) {
          if (err) {
            return callback(err);
          } else if (!ssul) {
            return callback('not found');
          } else {
            return callback(null, ssul, channel);
          }
        });
      }
    }, function(ssul, channel, callback) {
      var likeKey = {
        'user_id': req.user.id,
        'key': 'ssul|' + ssul.author + '|' + ssul.created,
      };

      var ssulKey = {
        'author': ssul.author,
        'created': ssul.created,
        'expected': true
      }

      if (req.params.action === 'like') {
        likeKey.expected = true;
        db.likes.save(likeKey, {}, function(err, info) {
          if (err) {
            return callback(err);
          } else {
            db.ssuls.update(key, {'likeCount': '+1'});
            return callback(null, req.params.id);
          }
        });
      } else {
        db.likes.delete(likeKey, function(err, info) {
          if (err) {
            return callback(err);
          } else if (!info.user_id) {
            return callback('not found');
          } else {
            db.ssuls.update(key, {'likeCount': '-1'});
            return callback(null, null);
          }
        });
      }
    }, function(author, callback) {
      if (!global.redisClient || !author) {
        return callback(null);
      } else {
        db.users.find(author, function(err, authorInfo) {
          if (err) {
            return callback(null);
          } else {
            var authors = [];
            authors.push(authorInfo['ssul.it']);

            // action_type:action_id:target_key
            var actionKey = 'like:' + req.user.id + ':' + req.params.id + '|' + req.params.created;
            global.redisClient.get(actionKey, function(err, reply) {
              if (!err && !reply) {
                var message = req.user.nickname ? req.user.nickname + '님이 당신의 썰을 좋아합니다!' : '누군가 당신의 썰을 좋아합니다!';
                utils.sendMsg(author, 'AIzaSyCk9ozGirgmZ3Iamgfoht5E3GUb2lLwdbY', message, req.body.url ? req.body.url : 'http://ssul.it');
                // cannot send same issue for 2 hours
                global.redisClient.set(actionKey, +new Date());
                global.redisClient.expire(actionKey, 2 * 60 * 60);  // in second
              }
            });
          }

          return callback(null);
        });
      }
    }
  ], function(err) {
    if (err) {
      result['code'] = 400;
      result['message'] = err;

      return res.json(400, result);
    } else {
      result['code'] = 200;
      result['message'] = 'OK';

      return res.json(200, result);
    }
  });
}

exports.notice = function(req, res) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  if (!req.user) {
    result['code'] = 401;
    result['message'] = 'not logged in';
    return res.json(401, result);
  }

  if (req.user.id !== req.params.id && req.user.admin) {
    result['code'] = 401;
    result['message'] = 'not permitted';
    return res.json(401, result);
  }

  if (!req.body.message) {
    result['code'] = 400;
    result['message'] = 'bad request';
    return res.json(400, result);
  }

  var key = {};
  var options = {};
  var keyTemplate = {
    'AttributeValueList': [],
    'ComparisonOperator': ''
  };

  var keyMarks = JSON.parse(JSON.stringify(keyTemplate));
  keyMarks['AttributeValueList'].push({'S': req.params.id + '|' + req.params.created});
  keyMarks.ComparisonOperator = 'EQ';

  key['key'] = keyMarks;
  options['AttributesToGet'] = ['user_id'];
  options.origin = true;

  // get reader list
  db.bookmarks.query(key, options, function (err, markInfo) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    }

    var readers = [];
    for (var idx in markInfo.Items) {
      readers.push({'id': markInfo.Items[idx]['user_id']});
    }

    readers.push({'id': {'S': req.params.id}});

    if (readers.length === 0) {
      result['code'] = 200;
      result['message'] = 'OK';
      result['count'] = 0;
      return res.json(200, result);
    }

    // get reg_id of readers
    var keys = [ {'Users': { 'Keys': readers, 'AttributesToGet': ['ssul.it'] }}];
    if (readers.length === 0) {
      result['code'] = 200;
      result['message'] = 'OK';
      result['count'] = readers.length;
      return res.json(200, result);
    }

    db.ssuls.findBatch(keys, function(_err, regInfo) {
      if (_err) {
        result['code'] = 500;
        result['message'] = _err;
        return res.json(500, result);
      }

      var regIds = [];
      for (var idx in regInfo.Users) {
        if (regInfo.Users[idx]['ssul.it']) regIds.push(regInfo.Users[idx]['ssul.it']);
      }

      // send notice message to users
      utils.sendMsg(regIds, 'AIzaSyCk9ozGirgmZ3Iamgfoht5E3GUb2lLwdbY', req.body.message, req.body.url, function(errMsg, infoMsg) {
        if (errMsg) {
          result['code'] = 500;
          result['message'] = errMsg;
          return res.json(500, result);
        }

        result['code'] = 200;
        result['message'] = 'OK';
        result['count'] = readers.length;
        return res.json(200, result);
      });
    });
  });
}

exports.getChannel = function(req, res, next) {
  var result = {
    code: 400,
    message: 'bad request'
  };

  var dynamodb = new global.aws.DynamoDB();
  var results = [];
  var failed = false;

	for(var idx in channels) {
    (function(idx, channel) {
      var info = {
        'TableName': 'Ssuls'
      };

      if (channel !== 'etc')
        info.TableName = info.TableName + '_' + channel;

      dynamodb.describeTable(info, function(err, data) {
        if (err) {
          failed = true;
        }

        var tmp = {
          'name': channel,
          'order': idx,
          'count': data.Table.ItemCount
        };

        results.push(tmp);

        if (results.length === channels.length) {
          if (failed) {
            result['code'] = 500;
            result['message'] = err.message;
            return res.json(500, result);
          } else {
            result['code'] = 200;
            result['message'] = 'OK';
            result['Channels'] = results;
            return res.json(200, result);
          }
        }
      });
    })(idx, channels[idx])
  };
}

exports.ch = function(req, res, next) {
  var dynamodb = new global.aws.DynamoDB();
  var info = {
    //TableName: 'Ssuls' + (req.query.channel ? '_' + req.query.channel : '')
    //TableName: 'Users'
    //TableName: 'Toks'
    //TableName: 'Devices'
    //TableName: 'Likes'
    TableName: 'Ssulit.Bookmarks'
  };
/*
  info['ExclusiveStartKey'] = {
  "appName": {
    "S": "ssul.it"
  },
  "deviceId": {
    "S": "358409050809178"
  }
};
*/

  //info['Limit'] = 10;

  var result = [];

  dynamodb.scan(info, function(err, data) {
    console.log("total = "+data.Items.length);
    for (var i = 0; i < data.Items.length; i++) {
      var ret = {};
      for (prop in data.Items[i]) {
        if(prop != 'returnTo' && prop != 'id')
          ret[prop] = data.Items[i][prop]['S'] ? data.Items[i][prop]['S'] : (data.Items[i][prop]['SS'] ? data.Items[i][prop]['SS'] : data.Items[i][prop]['N']);
      }

      key = ret['key'].split("|");
      mark_migrate(ret, key, i);

/*
      key = ret['key'].split("|");
      if(key[0] == 'ssul' || key[0] == 'tok')
        like_migrate(ret, key, i);
*/
      /*
      if(ret.appName != 'ssul.it') continue;
      device_migrate(ret, i);
      */
      //ssul_migrate(ret, i);
      //sendpost(ret, 'http://0-1-4.jmpnuts.appspot.com/users', null,i);
    }

    res.json(200, data.LastEvaluatedKey ? data.LastEvaluatedKey : 'OK');
  });

  function mark_migrate(ret, key, i) {
    db.users.find(key[0], function(err,info){
      if(err || info == null) console.log(err);
      else {
        ret.author = info['email'];
        mark_migrate_step2(ret, key, i);
      }
    });
  }

  function mark_migrate_step2(ret, key, i) {
    db.users.find(ret.user_id, function(err,info){
      if(err || info == null) console.log(err);
      else {
        ret.user = info['email'];

        ret.created = key[1];
        ret.tcreated = ret.position;

        sendpost(ret, 'http://0-1-4.jmpnuts.appspot.com/hanasy/mark/migrate', null, i);
      }
    });
  }

  function like_migrate(ret, key, i) {
    db.users.find(key[1], function(err,info){
      if(err || info == null) console.log(err);
      else {
        ret.author = info['email'];
        like_migrate_step2(ret, key, i);
      }
    });
  }

  function like_migrate_step2(ret, key, i) {
    db.users.find(ret.user_id, function(err,info){
      if(err || info == null) console.log(err);
      else {
        ret.user = info['email'];

        ret.created = key[2];

        if(key[0] == 'ssul') {
          url = 'http://0-1-4.jmpnuts.appspot.com/hanasy/like/migrate/hanasies';
        } else if(key[0] == 'tok') {
          ret.tcreated = key[3];
          url = 'http://0-1-4.jmpnuts.appspot.com/hanasy/like/migrate/parts'
        }

        sendpost(ret, url, null, i);
      }
    });
  }

  function device_migrate(ret, i) {
    if(ret.user_id) {
      db.users.find(ret.user_id, function(err,info){
        if(err || !info) console.log(err);
        else {
          ret.author = info['email'];
          sendpost(ret, 'http://0-1-4.jmpnuts.appspot.com/devices/migrate', null, i);
        }
      });
    } else {
      sendpost(ret, 'http://0-1-4.jmpnuts.appspot.com/devices/migrate', null, i);
    }
  }

  function ssul_migrate(ret, i) {
    var author = ret.author;

    db.users.find(ret.author, function(err,info){
      if(err || !info) console.log(err);
      else {
        ret.author_id = ret.author;
        ret.author = info['email'];

        sendpost(ret, 'http://0-1-4.jmpnuts.appspot.com/hanasy/hanasies/migrate', tok_migrate, i);
      }
    });
  }

  function tok_migrate(author, author_email, created, j) {
    var keyTemplate = {
      'AttributeValueList': [],
      'ComparisonOperator': ''
    };
    var key = {};
    var options = {};
    var keyString = author+"|"+created;

    var keyToks = JSON.parse(JSON.stringify(keyTemplate));

    keyToks['AttributeValueList'].push({'S': keyString});
    keyToks.ComparisonOperator = 'EQ';

    key['key'] = keyToks;

    options.IndexName = 'key-created-index';

    db.toks.query(key, options, function(err, info) {
      if (err) {
        result['code'] = 500;
        result['message'] = err;
        return res.json(500, result);
      }

      if (info.LastEvaluatedKey)
        console.log("is not ended = " + info.LastEvaluatedKey);

      for(i in info.data) {
        info.data[i].author = author_email;
        info.data[i].screated = created;

        k = j + " - " + i;

        sendpost(info.data[i], 'http://0-1-4.jmpnuts.appspot.com/hanasy/parts/migrate', null, k);
        //sendpost(info.data[i], 'http://localhost:8080/hanasy/parts/migrate', null, k);
      }
    });
  }

  function sendpost(formbody, url, callback,i) {
    var request = require('request');
    var author = formbody.author;
    var created = formbody.created;
      //console.log(formbody);
    request.post(
        url,
        { form: formbody },
        function (error, response, body) {
            if (!error && (response.statusCode == 200 || response.statusCode == 201)) {
                console.log(i);
                //console.log(body)
                if(callback != null) {
                  callback(formbody.author_id, formbody.author, formbody.created, i);
                }
            } else {
              console.log(formbody);
            }

            //console.log(body)
        }
    );
  }
}

