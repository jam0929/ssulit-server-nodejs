exports.create = function(req, res){
	// Login POST
	// Here you would pull down your user credentials and match them up
	// to the request
	req.session.username = req.body.username;
	res.send({auth: true, id: req.session.id, username: req.session.username});
};

exports.get = function(req, res){
	// This checks the current users auth
	// It runs before Backbones router is started
	// we should return a csrf token for Backbone to use
	if(typeof req.session.username !== 'undefined'){
		res.send({auth: true, id: req.session.id, username: req.session.username, _csrf: req.session._csrf});
	} else {
		res.send({auth: false, _csrf: req.session._csrf});
	}
};

exports.del = function(req, res, next){
	// Logout by clearing the session DELETE
	req.session.regenerate(function(err){
		// Generate a new csrf token so the user can login again
		// This is pretty hacky, connect.csrf isn't built for rest
		// I will probably release a restful csrf module
		csrf.generate(req, res, function () {
			res.send({auth: false, _csrf: req.session._csrf});    
		});
	}); 
};

