
/*
 * GET home page.
 
app.post('/api/app', controllers.setApp);
app.get('/api/app', controllers.getApp);
app.get('/api/app/:id', controllers.getApp);
app.put('/api/app/:id', controllers.setApp);
app.del('/api/app/:id', controllers.delApp);

app.post('/api/like', controllers.setLike);
app.get('/api/like', controllers.getLike);
app.get('/api/like/:id', controllers.getLike);
app.put('/api/like/:id', controllers.setLike);
app.del('/api/like/:id', controllers.delLike);
 */

exports.index = function(req, res){
	res.redirect('/public/');
};

/*****
app.post('/api/app', controllers.setApp);
app.put('/api/app/:id', controllers.setApp);
*****/
exports.setApp = function(req, res){
  var title = req.body.title;
  var description = req.body.description;
  var content = req.body.content;
  var variables = req.body.variables;
  var is_anonymous = req.body.is_anonymous ? req.body.is_anonymous : 0;
  var user_id = req.body.user_id;
  
  if(title === null || content === null || user_id === null) {
    return res.json(400, {'message': 'mising parameters'});
  }
  
  content = content.replace(/\r\n/gi, "\n");
  content = content.replace(/\n/gi, "<br />");
  content = content.replace(/\"/gi, '\\"');
  content = content.replace(/\'/gi, "\\'");

  var query;
	if(req.params.id) {
    //update
		query = "UPDATE `ka_apps` SET"+
        "`title`='"+title+"',"+
        "`content`='"+content+"',"+
        "`user_id`='"+user_id+"',"+
        "`uid`='"+user_id+"',"+
        "`updated`=NOW()"+
        "WHERE `id`="+req.params.id+";";
	} else {
    query = "INSERT INTO `ka_apps` " +
        "(`title`, `description`, `content`, `variables`, `user_id`, `uid`, `is_anonymous`, `count_likes`, `updated`, `created`) "+
        "VALUES "+
        "('"+title+"', '"+description+"', '"+content+"', '"+JSON.stringify(variables)+"', '"+user_id+"', '"+user_id+"', '"+is_anonymous+"', '0', NOW(), NOW());";
	}
	
	var dbcon = global.mysql.createConnection(global.mysqlConfig);
	dbcon.query(query, function(err, rows) {
		if(err) {
      return res.json(500, {'message': 'failed to qurey database'});
		}

    return res.json(200, rows);
	});
  dbcon.end();
};

exports.getApp = function(req, res){
	var query;

	if(req.params.id) {
		query = "SELECT "+
      "`id`,"+
      "`title`,"+
      "`description`,"+
      "`content`,"+
      "`variables`,"+
      "`user_id`,"+
      "`uid`,"+
      "`count_likes`,"+
      "DATE_FORMAT(`updated`,'%y-%m-%d %H:%i:%s') AS `updated`, "+
      "DATE_FORMAT(`created`,'%y-%m-%d %H:%i:%s') AS `created`"+
      " FROM `ka_apps` WHERE `id`='"+req.params.id+"';";
	} else {
		var offset = req.query.offset ? req.query.offset : 0;
		var limit = req.query.limit ? req.query.limit : 10;
		var order = req.query.order ? req.query.order : 'id desc';
		var user_id = req.query.user_id ? req.query.user_id : null;

		query = "SELECT "+
      "`id`,"+
      "LEFT(`title`,20) AS `title`,"+
      "LEFT(REPLACE(`description`, '<br />', ' '),55) AS `description`, "+
      "`content`,"+
      "`variables`,"+
      "`user_id`,"+
      "`uid`,"+
      "`count_likes`,"+
      "DATE_FORMAT(`updated`,'%y-%m-%d %H:%i:%s') AS `updated`, "+
      "DATE_FORMAT(`created`,'%y-%m-%d %H:%i:%s') AS `created`"+
      " FROM `ka_apps`"+(user_id ? " WHERE `uid`='"+user_id+"'" : "")+" ORDER BY "+order+" LIMIT "+offset+", "+limit+";"
	}
	var dbcon = global.mysql.createConnection(global.mysqlConfig);
	dbcon.query(query, function(err, rows) {
		if(err) {
      return res.json(500, {'message': 'failed to query database'});
		}

    return res.json(200, req.params.id ? rows[0] : rows);
	});
  dbcon.end();
};

exports.delApp = function(req, res){
  if(req.params.id === null) {
    return res.json(400, {'message': 'mising parameters'});
  }

	var dbcon = global.mysql.createConnection(global.mysqlConfig);
	dbcon.query("DELETE FROM `ka_apps` WHERE id = '"+req.params.id+"' AND uid='"+req.user.id+"'", function(err, rows) {
		if(err) {
      return res.json(500, {'message': 'failed to query database'});
		} else if (rows.affectedRows === 0) {
  		return res.json(409, {'message': 'cannot delete app'});
		}

    return res.json(200, rows);
	});
	dbcon.end();
};



exports.setLike = function(req, res){
  var user_id = req.body.user_id;
  var app_id = req.body.app_id;
  var comment = req.body.comment;

  if(user_id === null || app_id === null) {
    return res.json(400, {'message': 'mising parameters'});
  }

  var query;
  var dbcon = global.mysql.createConnection(global.mysqlConfig);
	if(req.params.id) {
    //update
		query = "UPDATE `ka_likes` SET"+
        "`user_id`='"+user_id+"',"+
        "`uid`='"+user_id+"',"+
        "`app_id`='"+app_id+"',"+
        "`comment`='"+comment+"',"+
        "`updated`=NOW()"+
        "WHERE `id`="+req.params.id+";";
	} else {
    query = "SELECT * FROM `ka_likes` WHERE `uid`='"+user_id+"' AND `app_id`='"+app_id+"';";
	  dbcon.query(query, function(err, rows) {
      if(rows[0]) {
        return res.json(400, {'message': 'already liked'});
      } else {
        var _dbcon = global.mysql.createConnection(global.mysqlConfig);
        _dbcon.query("INSERT INTO `ka_likes` " +
        "(`user_id`, `uid`, `app_id`, `updated`, `created`) "+
        "VALUES "+
        "('"+user_id+"', '"+user_id+"', '"+app_id+"', NOW(), NOW());", function(err, rows) {
          if(err) {
            return res.json(500, {'message': 'failed to qurey database'});
          }
          query = "UPDATE `ka_apps` SET `count_likes`=`count_likes`+1 WHERE `id`='"+app_id+"';";

          var __dbcon = global.mysql.createConnection(global.mysqlConfig);
          __dbcon.query(query, function(err, rows) {
              //
          });
          __dbcon.end();

          return res.json(200, rows);
        });
        _dbcon.end();
      }
    });
  }
  dbcon.end();
};

exports.getLike = function(req, res){
  var user_id = req.query.user_id;
	var app_id = req.query.app_id;
  
  if(!user_id || !app_id || user_id === 'undefined' || app_id === 'undefined') {
    return res.json(400, {'message': 'mising parameters'});
  }
  var dbcon = global.mysql.createConnection(global.mysqlConfig);
  var query = "SELECT * FROM `ka_likes` WHERE `uid`='"+user_id+"' AND `app_id`='"+app_id+"';";
  
	dbcon.query(query, function(err, rows) {
		if(err) {
		  return res.json(500, {'message': 'failed to qurey database'});
		}
		
		return res.json(200, rows[0]);
	});

	dbcon.end();
};

exports.delLike = function(req, res){
  var user_id = req.query.user_id;
  var app_id = req.query.app_id;

  if(!req.params.id || !user_id || !app_id) { 
    return res.json(400, {'message': 'mising parameters'});
  }

	var dbcon = global.mysql.createConnection(global.mysqlConfig);
  dbcon.query("DELETE FROM `ka_likes` WHERE `id`='"+req.params.id+"' AND `user_id`='"+user_id+"' AND `app_id`='"+app_id+"';", function(err, rows) {
		if(err) {
		  return res.json(500, {'message': 'failed to qurey database'});
		}
    query = "UPDATE `ka_apps` SET `count_likes`=`count_likes`-1 WHERE `id`='"+app_id+"';";
    var _dbcon = global.mysql.createConnection(global.mysqlConfig);
    _dbcon.query(query, function(err, rows) {
        //
    });

    _dbcon.end();
    
    return res.json(200, rows);
	});
  dbcon.end();
};
