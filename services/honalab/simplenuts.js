/*
 * services/honalab/kakaoapp.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 21
 * KAKAOAPP COLLECTION
 */

// SET GREENLIGHT (ADD/UPDATE)
exports.set = function(req, res) {
  if (!req.user) {
    return res.json(401, {'message': 'not logged in'});
  }
  
  if (!req.params.id && (req.body.title === null || req.body.content === null || req.body.variables)) {
    return res.json(400, {'message': 'mising parameter'});
  }
  
  var created = +new Date();  //current timestamp
  var id = req.params.id ? req.params.id : created * 100 +Math.floor(Math.random() * 100);

  var keyInfo = {
    'board': 'kakaoapp',
    'id': id.toString()
  };
  
  var reqBody = req.body;
  
  if (req.params.id) {
    // UPDATE ARTICLE
    db.articles.update(keyInfo, reqBody, function(err, info) {
      if (err) {
        return res.json(500, {'message': err});
      }
      
      if (info.like) {
        if (info.like.indexOf(req.user.id) !== -1) {
          info.liked = true;
        }
        
        delete info.like;
      }
      
      return res.json(200, reqBody);
    });
  } else {
    // ADD NEW ARTICLE
    reqBody['created'] = created;
    reqBody['author'] = req.user.id;
    reqBody['vote_count'] = 0;
    reqBody['recent_vote_count'] = 0;

    db.articles.save(keyInfo, reqBody, function(err, info) {
      if (err) {
        return res.json(500, {'message': err});
      }
      
      return res.json(200, info);
    });
  }
}

exports.get = function(req, res) {
  if (req.params.id) {
    // GET SPECIFIC ARTICLE INFO
    db.articles.find('kakaoapp', req.params.id, function(err, info) {
      if (err) {
        return res.json(500, {'message': err});
      }
      
      if (req.params.attribute && info[req.params.attribute]) {
        var ret = {};
        ret[req.params.attribute] = info[req.params.attribute];
        return res.json(200, ret);
      }
      
      if (info && info.like) {
        if (req.user && info.like.indexOf(req.user.id) !== -1) {
          info.liked = true;
        }
        
        delete info.like;
      }
      
      return res.json(200, info);
    });
  } else {
    // GET ARTICLE LIST
    // BUILD OPTIONS FOR QUERYING
    var order = req.query.order;
    var options = {};
    var key = {
      'board': 'kakaoapp'
    };
    
    if (order) {
      switch (order) {
        case 'trends':
          options.IndexName = 'recent_vote_count-index';
          options.ScanIndexForward = false;
          break;
        case 'best':
          options.IndexName = 'vote_count-index';
          options.ScanIndexForward = false;
          break;
        case 'new':
          options.ScanIndexForward = false;
        default:
          break;
      }
    }
    
    options.Limit = req.query.limit ? req.query.limit : 20;
    
    if (req.query.LastEvaluatedKey) {
      options.ExclusiveStartKey = JSON.parse(req.query.LastEvaluatedKey);
    }
    
    if (req.query.author) {
      key['author'] = req.query.author;
      options.IndexName = 'author-index';
    }

    db.articles.query(key, options, function(err, info) {
      if (err) {
        return res.json(500, {'message': err});
      }
      
      for (var i = 0; i < info.data.length; i++) {
        info.data[i].title = info.data[i].title.substring(0, 20) + (info.data[i].title.length > 20 ? '...' : '');
        info.data[i].content = info.data[i].content.substring(0, 55).replace('<br />', ' ') + (info.data[i].content.length > 55 ? '...' : '');
        if (info.data[i].like)
          delete info.data[i].like;
      }

      return res.json(200, info);
    });
  }
}

exports.del = function(req, res) {
  if (!req.user) {
    return res.json(401, {'message': 'not logged in'});
  }
  
  db.articles.delete('kakaoapp', req.params.id, function(err, info) {
    if (err) {
      return res.json(500, {'message': err});
    }
    
    return res.json(200, info);
  });
}

// LIKE
exports.addLike = function(req, res) {
  if (!req.user) {
    return res.json(401, {'message': 'not logged in'});
  }

  db.articles.find('kakaoapp', req.params.id, function(err, info) {
    if (info.like && (info.like.indexOf(req.user.id) !== -1)) {
      return res.json(400, {'message': 'already liked'});
    }
    
    else {
      db.articles.addLike('kakaoapp', req.params.id, req.user.id, function(_err, _info) {
        if (_err) {
          return res.json(500, {'message': _err});
        }

        delete _info.like;
        _info.liked = true;
        return res.json(200, _info);
      });
    }
  });
}

exports.delLike = function(req, res) {
  if (!req.user) {
    return res.json(401, {'message': 'not logged in'});
  }

  db.articles.find('kakaoapp', req.params.id, function(err, info) {
    if (!info.like || info.like.indexOf(req.user.id) === -1) {
      return res.json(400, {'message': 'not liked yet'});
    }
    
    else {
      db.articles.delLike('kakaoapp', req.params.id, req.user.id, function(_err, _info) {
        if (_err) {
          return res.json(500, {'message': _err});
        }

        if (_info.like) {
          delete _info.like;
        }
        
        return res.json(200, _info);
      });
    }
  });
}