
/*
 * GET home page.

 
app.post('/api/article', controllers.setArticle);
app.get('/api/article', controllers.getArticle);
app.get('/api/article/:id', controllers.getArticle);
app.put('/api/article/:id', controllers.setArticle);
app.del('/api/article/:id', controllers.delArticle);

app.post('/api/light', controllers.setLight);
app.get('/api/light', controllers.getLight);
app.get('/api/light/:id', controllers.getLight);
app.put('/api/light/:id', controllers.setLight);
app.del('/api/light/:id', controllers.delLight);

 */

exports.index = function(req, res){
	res.redirect('/public/');
};

/*****
app.post('/api/article', controllers.setArticle);
app.put('/api/article/:id', controllers.setArticle);
*****/
exports.setArticle = function(req, res){
  var title = req.body.title;
  var content = req.body.content;
  var is_anonymous = req.body.is_anonymous ? req.body.is_anonymous : 0;
  var user_id = req.body.user_id;

  if(title === null || content === null || user_id === null) {
    return res.json(400, {'message': 'mising parameter'});
  }
  
  content = content.replace(/\r\n/gi, "\n");
  content = content.replace(/\n/gi, "<br />");
  content = content.replace(/\"/gi, '\\"');
  content = content.replace(/\'/gi, "\\'");

  var query;
	if(req.params.id) {
    //update
		query = "UPDATE `gl_articles` SET"+
        "`title`='"+title+"',"+
        "`content`='"+content+"',"+
        "`user_id`='"+user_id+"',"+
        "`uid`='"+user_id+"',"+
        "`updated`=NOW()"+
        "WHERE `id`="+req.params.id+";";
	} else {
    query = "INSERT INTO `gl_articles` " +
        "(`title`, `content`, `user_id`, `uid`, `is_anonymous`, `count_lights`, `updated`, `created`) "+
        "VALUES "+
        "('"+title+"', '"+content+"', '"+user_id+"', '"+user_id+"', '"+is_anonymous+"', '0', NOW(), NOW());";
	}

	var dbcon = global.mysql.createConnection(global.mysqlConfig);
	dbcon.query(query, function(err, rows) {
		if(err) {
      return res.json(500, {'message': 'failed to query database'});
		}

    return res.json(200, rows);
	});
  dbcon.end();
};

exports.getArticle = function(req, res){
	var query;
	if(req.params.id) {
		query = "SELECT "+
      "`id`,"+
      "`title`,"+
      "`content`,"+
      "`user_id`,"+
      "`uid`,"+
      "`count_lights`,"+
      "DATE_FORMAT(`updated`,'%y-%m-%d %H:%i:%s') AS `updated`, "+
      "DATE_FORMAT(`created`,'%y-%m-%d %H:%i:%s') AS `created`"+
      " FROM `gl_articles` WHERE `id`='"+req.params.id+"';";
	} else {
		var offset = req.query.offset ? req.query.offset : 0;
		var limit = req.query.limit ? req.query.limit : 10;
		var order = req.query.order ? req.query.order : 'id desc';
		var user_id = req.query.user_id ? req.query.user_id : null;

		query = "SELECT "+
      "`id`,"+
      "LEFT(`title`,20) AS `title`,"+
      "LEFT(REPLACE(`content`, '<br />', ' '),55) AS `content`, "+
      "`user_id`,"+
      "`uid`,"+
      "`count_lights`,"+
      "DATE_FORMAT(`updated`,'%y-%m-%d %H:%i:%s') AS `updated`, "+
      "DATE_FORMAT(`created`,'%y-%m-%d %H:%i:%s') AS `created`"+
      " FROM `gl_articles`"+(user_id ? " WHERE `uid`='"+user_id+"'" : "")+" ORDER BY "+order+" LIMIT "+offset+", "+limit+";"
	}
	var dbcon = global.mysql.createConnection(global.mysqlConfig);
	dbcon.query(query, function(err, rows) {
		if(err) {
      return res.json(500, {'message': 'failed to query database'});
		}

		return res.json(200, req.params.id ? rows[0] : rows);;
	});
  dbcon.end();
};

exports.delArticle = function(req, res){
	var dbcon = global.mysql.createConnection(global.mysqlConfig);
	dbcon.query("SELECT * FROM `gl_articles` LIMIT 0, 10", function(err, rows) {
		if(err) {
      return res.json(500, {'message': 'failed to qurey database'});
		}
    
    return res.json(200, rows);
	});
	dbcon.end();
};



exports.setLight = function(req, res){
  var user_id = req.body.user_id;
  var article_id = req.body.article_id;
  var comment = req.body.comment;

  if(user_id === null || article_id === null) {
    return res.json(400, {'message': 'mising parameter'});
  }

  var query;
  var dbcon = global.mysql.createConnection(global.mysqlConfig);
	if(req.params.id) {
    //update
		query = "UPDATE `gl_lights` SET"+
        "`user_id`='"+user_id+"',"+
        "`uid`='"+user_id+"',"+
        "`article_id`='"+article_id+"',"+
        "`comment`='"+comment+"',"+
        "`updated`=NOW()"+
        "WHERE `id`="+req.params.id+";";
	} else {
    query = "SELECT * FROM `gl_lights` WHERE `uid`='"+user_id+"' AND `article_id`='"+article_id+"';";
	  dbcon.query(query, function(err, rows) {
      if(rows[0]) {
        return res.json(200, rows);
      } else {
        var _dbcon = global.mysql.createConnection(global.mysqlConfig);
        _dbcon.query("INSERT INTO `gl_lights` " +
        "(`user_id`, `uid`, `article_id`, `comment`, `updated`, `created`) "+
        "VALUES "+
        "('"+user_id+"', '"+user_id+"', '"+article_id+"', '"+comment+"', NOW(), NOW());", function(err, rows) {
          if(err) {
            return res.json(500, {'message': 'failed to qurey database'});
          }
          query = "UPDATE `gl_articles` SET `count_lights`=`count_lights`+1 WHERE `id`='"+article_id+"';";

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

exports.getLight = function(req, res){
  console.log(req.query);
  var user_id = req.query.user_id;
	var article_id = req.query.article_id;

  if(!user_id || !article_id || user_id === 'undefined' || article_id === 'undefined') {
    return res.json(400, {'message': 'mising parameter'});
  }
  var dbcon = global.mysql.createConnection(global.mysqlConfig);
  var query = "SELECT * FROM `gl_lights` WHERE `uid`='"+user_id+"' AND `article_id`='"+article_id+"';";
  console.log(query);
	dbcon.query(query, function(err, rows) {
		if(err) {
      return res.json(500, {'message': 'failed to query database'});
		}

    return res.send(200, rows);
	});

	dbcon.end();
};

exports.delLight = function(req, res){
  var user_id = req.body.user_id;
  var article_id = req.body.article_id;

  if(!req.params.id || !user_id || !article_id) { res.send(500); }

	var dbcon = global.mysql.createConnection(global.mysqlConfig);
  dbcon.query("DELETE FROM `gl_lights` WHERE `id`='"+req.params.id+"' AND `uid`='"+user_id+"' AND `article_id`='"+article_id+"';", function(err, rows) {
		if(err) {
      return res.json(500, {'message': 'failed to query database'});
		}
    query = "UPDATE `gl_articles` SET `count_lights`=`count_lights`-1 WHERE `id`='"+article_id+"';";
    var _dbcon = global.mysql.createConnection(global.mysqlConfig);
    _dbcon.query(query, function(err, rows) {
        //
    });

    _dbcon.end();
    return res.send(200, rows);
	});
  dbcon.end();
};
