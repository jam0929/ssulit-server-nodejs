/**
 * One day in milliseconds.
 */

var oneDayInMilliseconds = 86400000;

// get/set a token
exports.find = function(key, done) {
  var dynamodb = new global.aws.DynamoDB();

  var selection = {
    TableName:'OAuth2Codes'
  };

  selection['Key'] = {
    'id': {
      'S': key
    }
  };

  dynamodb.getItem(selection, function checkValidation(err, data) {
    if (err || !data.Item || data.Item.expires['N'] < new Date) {
      return done(null, null);
    } else {
      var auth_code = {
        'key': key,
        'client_id': data.Item.client_id['S'],
        'redirect_uri': data.Item.redirect_uri['S'],
        'user_id': data.Item.user_id['S']
      };

      return done(null, auth_code);
    }
  });
};

exports.save = function(code, client_id, redirect_uri, user_id, done) {
  var dynamodb = new global.aws.DynamoDB();
  var selection = {
    TableName:'OAuth2Codes'
  };
  var expires = (+new Date()) + 1000 * 60 * 1;

  selection['Item'] = {
    'key': {
      'S': code
    },
    'user_id': {
      'S': user_id
    },
    'client_id': {
      'S': client_id
    },
    'redirect_uri': {
      'S': redirect_uri
    },
    'expires': {
      'N' : JSON.stringify(expires)
    }
  };

  dynamodb.putItem(selection, function checkValidation(err, data) {
    return done(err);
  });
};

/**
 * Cleans up expired token
 * 
 * @param {Function} fn
 * @api public
 */
exports.reap = function(done) {
  var dynamodb = new global.aws.DynamoDB();

  var now = +new Date;
  var selection = {
    TableName: 'OAuth2Codes'
  };
  selection['ScanFilter'] = {
    'expires': {
      'AttributeValueList': [{ 'N': now.toString() }],
      'ComparisonOperator': 'LT'
    }
  };
  selection['AttributesToGet'] = ['key'];

  dynamodb.scan(selection, function(err, data) {
    if (err) {
      console.log(err);
      return done;
    }
    if (data.Count === 0) return;
    destroy(data.Items, done);
  });
}

function destroy(data, done) {
  var dynamodb = new global.aws.DynamoDB();

  var selection = {
    TableName: 'OAuth2Codes'
  };
  for (item in data) {
    selection['Key'] = data[item];

    dynamodb.deleteItem(selection, function( ) { });
  }
}