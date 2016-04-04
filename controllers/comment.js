
/*
 * comments
 */
var db = require('../db');

exports.setComment = function(req, res) {
  var created = +new Date();  //current timestamp
  var id = req.body.id ? req.body.id : created * 100 +Math.floor(Math.random() * 100);
  
  if (!req.body.key || !req.body.content) {
    return res.json(400, {'message': 'mising parameter'});
  }
  
  if (!req.user) {
    return res.json(401, {'message': 'not logged in'});
  }
  
  var content = req.body.content;
  content = content.replace(/\r\n/gi, "\n");
  content = content.replace(/\n/gi, "<br />");
  content = content.replace(/\"/gi, '\\"');
  content = content.replace(/\'/gi, "\\'");
  
  var reqInfo = {
    'key': req.body.key,
    'id': id,
    'created': created,
    'content': content,
    'user_id': req.user.id,
    'username': req.user.name
  }

  if (req.params.id) {
    //update
    db.comments.update(reqInfo, function(err, info) {
      if (err) {
        return res.json(500, {'message': err});
      }
      return res.json(200, info);
    });
  } else {
    //insert
    db.comments.create(reqInfo, function(err, info) {
      if (err) {
        return res.json(500, {'message': err});
      }
      return res.json(200, info);
    });
  }
}

exports.getComment = function(req, res) {
  if (!req.query.key) {
    return res.json(400, {'message': 'mising parameter'});
  }
  
  var reqInfo = {
    'key': req.query.key
  }
  
  if (req.params.id) {
    // get the comment detail
    reqInfo['id'] = req.params.id;
    
    db.comments.get(reqInfo, function(err, info) {
      if (err) {
        return res.json(500, {'message': 'internal error'});
      }
      return res.json(200, info);
    });
  } else {
    // get overall comment of the key
    db.comments.getList(reqInfo, function(err, info) {
      if (err) {
        return res.json(500, {'message': 'internal error'});
      }
      return res.json(200, info);
    });
  }
}

exports.delComment = function(req, res){
	var dbcon = global.mysql.createConnection(global.mysqlConfig);
	dbcon.query("SELECT * FROM `comments` LIMIT 0, 10", function(err, rows) {
		if(err) {
      return res.json(500, {'message': 'failed to qurey database'});
		}

    return res.json(200, rows);
	});
	dbcon.end();
};


