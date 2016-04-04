
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

app.post('/api/user', controllers.setUser); //everyone
app.get('/api/user', controllers.getUser);  //admin
app.get('/api/user/:id', controllers.getUser);  //owner, admin
app.put('/api/user/:id', controllers.setUser);  //owner, admin
app.del('/api/user/:id', controllers.delUser);  //owner, admin

//app.put('/api/auth', controllers.setAuth);  //regist
app.post('/api/auth', controllers.getAuth); //signin

app.get('/api/auth/:id', controllers.getAuth);  //validation
app.put('/api/auth/:id', controllers.setAuth);  //update
app.del('/api/auth/:id', controllers.delAuth);  //signout

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
    res.send('{response:500,message:"mising parameters"}');
    return false;
  }
  content = content.replace(/\r\n/gi, "\n");
  content = content.replace(/\n/gi, "<br />");
  content = content.replace(/\"/gi, '\\"');
  content = content.replace(/\'/gi, "\\'");
  console.log(content);
  var query;
	if(req.params.id) {
    //update
		query = "UPDATE `gag_content` SET"+
        "`title`='"+title+"',"+
        "`content`='"+content+"',"+
        "`user_id`='"+user_id+"',"+
        "`uid`='"+user_id+"',"+
        "`updated`=NOW()"+
        "WHERE `id`="+req.params.id+";";
	} else {
    query = "INSERT INTO `gag_content` " +
        "(`title`, `content`, `user_id`, `uid`, `is_anonymous`, `count_lights`, `updated`, `created`) "+
        "VALUES "+
        "('"+title+"', '"+content+"', '"+user_id+"', '"+user_id+"', '"+is_anonymous+"', '0', NOW(), NOW());";
	}
  console.log(query);
	var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
	dbcon.query(query, function(err, rows) {
		if(err) {
			res.send("failed to query database");
			return false;
		}

		res.send(rows);

		return true;
	});
  dbcon.end();
};

exports.getArticle = function(req, res){
	var query;
	if(req.params.id) {
		query = "SELECT "+
      "`id`,"+
      "`name`,"+
      "`items`,"+
      "`uid`,"+
      "`view_count`,"+
      "`vote_count`,"+
      "DATE_FORMAT(`created`,'%y-%m-%d %H:%i:%s') AS `created`"+
      " FROM `Gags` WHERE `id`='"+req.params.id+"' and status = 'opened' and gc_id in (13, 19);";
	} else {
		var offset = req.query.offset ? req.query.offset : 0;
		var limit = req.query.limit ? req.query.limit : 10;
		var order = req.query.order ? req.query.order : 'id desc';
		var user_id = req.query.user_id ? req.query.user_id : null;

		query = "SELECT "+
      "`id`,"+
      "LEFT(`name`,20) AS `name`,"+
      "items,"+
//      "LEFT(REPLACE(`content`, '<br />', ' '),55) AS `content`, "+
      "`uid`,"+
      "`view_count`,"+
      "`vote_count`,"+
      "DATE_FORMAT(`created`,'%y-%m-%d %H:%i:%s') AS `created`"+
      " FROM `Gags` WHERE `status` = 'opened' and gc_id in (13, 19) "+(user_id ? " AND `uid`='"+user_id+"'" : "")+" ORDER BY "+order+" LIMIT "+offset+", "+limit+";"
	}
	var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
	dbcon.query(query, function(err, rows) {
		if(err) {
			res.send("failed to query database");
			return false;
		}

    if(req.params.id) {
      res.send(rows[0]);
    }
    else {
  		res.send(rows);
    }
    
		return true;
	});
  dbcon.end();
};

exports.delArticle = function(req, res){
	var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
	dbcon.query("SELECT * FROM `gag_content` LIMIT 0, 10", function(err, rows) {
		if(err) {
			res.send("failed to query database");
			return false;
		}

		res.send(rows);

		return true;
	});
	dbcon.end();
};


exports.setLike = function(req, res){
  var article_id = req.body.article_id;

  if(article_id === null) {
    res.send('{response:500,message:"mising parameters"}');
    return false;
  }

  var query;
  var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
  query = "UPDATE `Gags` SET recent_vote_count = recent_vote_count + 1, vote_count = vote_count + 1 WHERE `id`='"+article_id+"';";
  dbcon.query(query, function(err, rows) {
    res.send(rows);
  });
  
  dbcon.end();
};

exports.setLight = function(req, res){
  var user_id = req.body.user_id;
  var article_id = req.body.article_id;
  var comment = req.body.comment;

  if(user_id === null || article_id === null) {
    res.send('{response:500,message:"mising parameters"}');
    return false;
  }

  var query;
  var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
	if(req.params.id) {
    //update
		query = "UPDATE `gag_likes` SET"+
        "`user_id`='"+user_id+"',"+
        "`uid`='"+user_id+"',"+
        "`article_id`='"+article_id+"',"+
        "`comment`='"+comment+"',"+
        "`updated`=NOW()"+
        "WHERE `id`="+req.params.id+";";
	} else {
    query = "SELECT * FROM `gag_likes` WHERE `uid`='"+uid+"' AND `article_id`='"+article_id+"';";
	  dbcon.query(query, function(err, rows) {
      if(rows[0]) {
        res.send(rows);
        return false;
      } else {
        var _dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
        _dbcon.query("INSERT INTO `gag_likes` " +
        "(`user_id`, `uid`, `article_id`, `comment`, `updated`, `created`) "+
        "VALUES "+
        "('"+user_id+"', '"+user_id+"', '"+article_id+"', '"+comment+"', NOW(), NOW());", function(err, rows) {
          if(err) {
            res.send("failed to query database : "+err);
            return false;
            dbcon.end();
          }
          query = "UPDATE `gag_content` SET `count_lights`=`count_lights`+1 WHERE `id`='"+article_id+"';";
          console.log(query);
          var __dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
          __dbcon.query(query, function(err, rows) {
              //
          });
          __dbcon.end();

          res.send(rows);

          return true;
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
    res.send('{response:500,message:"mising parameters"}');
    return false;
  }
  var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
  var query = "SELECT * FROM `gag_likes` WHERE `uid`='"+user_id+"' AND `article_id`='"+article_id+"';";
  console.log(query);
	dbcon.query(query, function(err, rows) {
		if(err) {
			res.send("failed to query database");
			return false;
		}

		res.send(rows);

		return true;
	});

	dbcon.end();
};

exports.delLight = function(req, res){
  var user_id = req.body.user_id;
  var article_id = req.body.article_id;

  if(!req.params.id || !user_id || !article_id) { res.send(500); }

	var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
  dbcon.query("DELETE FROM `gag_likes` WHERE `id`='"+req.params.id+"' AND `uid`='"+user_id+"' AND `article_id`='"+article_id+"';", function(err, rows) {
		if(err) {
			res.send("failed to query database");
			return false;
		}
    query = "UPDATE `gag_content` SET `count_lights`=`count_lights`-1 WHERE `id`='"+article_id+"';";
    var _dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
    _dbcon.query(query, function(err, rows) {
        //
    });

		res.send(rows);
    _dbcon.end();

		return true;
	});
  dbcon.end();
};


/*****
app.post('/api/user', controllers.setUser); //everyone
app.put('/api/user/:id', controllers.setUser);  //owner, admin

*****/
exports.setUser = function(req, res){
  var username = req.body.username;
  var password = req.body.password;
  var password_confirm = req.body.password_confirm;
  var age = req.body.age;
  var gender = req.body.gender;

  if(username === null || password === null) {
    res.send('{response:500,message:"mising parameters"}');
    return false;
  } else if(password_confirm && password !== password_confirm) {
    res.send('{response:400,message:"authontification failed"}');
    return false;
  }

  var query;
	if(req.params.id) {
    //update
		query = "UPDATE `users` SET"+
        "`username`='"+username+"',"+
        "`password`=md5('"+password+"'),"+
        "`updated`=NOW()"+
        "WHERE `id`="+req.params.id+";";
	} else {
    if(password_confirm) {
      //creation
      query = "INSERT INTO `users` " +
          "(`username`, `password`, `email`, `age`, `gender`, `is_confirmed`, `updated`, `created`) "+
          "VALUES "+
          "('"+username+"', md5('"+password+"'), NULL, '"+age+"', '"+gender+"', '0', NOW(), NOW());";
    } else {
      //signin
      query = "SELECT `id`, `username`, `email`, `is_confirmed`, `updated`, `created` FROM `users` "+
        "WHERE `username`='"+username+"' AND `password`=md5('"+password+"');";
    }
	}
	var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
	dbcon.query(query, function(err, rows) {
		if(err) {
			res.send("failed to query database");
			return false;
		}
    if(rows[0] && !password_confirm) {
      req.session.user = rows[0];
    }
		res.send(rows);

		return true;
	});

	dbcon.end();
};

/*****
app.get('/api/user', controllers.getUser);  //admin
app.get('/api/user/:id', controllers.getUser);  //owner, admin
*****/
exports.getUser = function(req, res){
  console.log(req.session);
  var query;
	if(req.params.id) {
    //id search
		query = "SELECT `id`, `username`, `email`, `is_confirmed`, `updated`, `created` FROM `users` "+
        "WHERE `id`="+req.params.id+";";
	} else {
    console.log(req.session.user);
    console.log(req.query);
    if(req.session.user) {
      if(typeof req.query.logout !== 'undefined') {
        console.log('logged out');
        req.session.destroy();
        res.send(200);
        return false;
      }

      query = "SELECT `id`, `username`, `email`, `is_confirmed`, `updated`, `created` FROM `users` "+
        "WHERE `id`="+req.session.user.id+";";
    } else {
      //search
      res.send('{response:400,message:"authontification failed"}');
      return false;
    }

	}
	var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
	dbcon.query(query, function(err, rows) {
		if(err) {
			res.send("failed to query database");
			return false;
		}
    if(req.params.id){
      req.session.user = rows[0];
    }

    if(req.params.id) {
      res.send(rows[0]);
    }
    else {
  		res.send(rows);
    }

		return true;
	});

	dbcon.end();
};

exports.delUser = function(req, res){
	var dbcon = global.mysql.createConnection(global.lullu_mysqlConfig);
	dbcon.query("SELECT * FROM `gag_content` LIMIT 0, 10", function(err, rows) {
		if(err) {
			res.send("failed to query database");
			return false;
		}

		res.send(rows);

		return true;
	});

	dbcon.end();
};