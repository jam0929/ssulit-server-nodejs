/**
 * One day in milliseconds.
 */

var oneDayInMilliseconds = 86400000;
var utils = require('../utils');

// check authorization
exports.findByID = function(user_id, client_id, done) {
  var dynamodb = new global.aws.DynamoDB();

  var selection = {
    TableName:'OAuth2Tokens'
  };

  selection['IndexName'] = 'refresh_token-index';
  selection['KeyConditions'] = {
    'user_id': {
      'AttributeValueList': [ { 'S': user_id } ],
      'ComparisonOperator': 'EQ'
    },
    'client_id': {
      'AttributeValueList': [ { 'S': client_id } ],
      'ComparisonOperator': 'EQ'
    }
  };
  selection['Select'] = 'ALL_ATTRIBUTES';

  // user_id / client_id / access_token / expires / refresh_token
  dynamodb.query(selection, function checkAuthorization(err, data) {
    if (err) {
      return done(err, null);
    } else if (!data.Items || utils.isEmpty(data.Items)) {
      // not authorize yet
      return done(null, null);
    } else {
      // authorized
      var result = {};
      if (data.Items[0].expires['N'] < new Date) {
        // expired
        result.message = 'expired';
        result.refresh_token = data.Items[0].refresh_token['S'];
        result.scope = data.Items[0].scope['SS'];
      } else {
        // already
        result.message = 'authorized';
        result.access_token = data.Items[0].key['S'];
        result.refresh_token = data.Items[0].refresh_token['S'];
        result.expires = data.Items[0].expires['N'];
        result.scope = data.Items[0].scope['SS'];
      }
      
      return done(null, result);
    }
  });
};

exports.findRefreshToken = function(refresh_token, done) {
  var dynamodb = new global.aws.DynamoDB();

  var selection = {
    TableName:'OAuth2Authorization'
  };

  selection['IndexName'] = 'refresh_token-index';
  selection['KeyConditions'] = {
    'refresh_token': {
      'AttributeValueList': [ { 'S': refresh_token } ],
      'ComparisonOperator': 'EQ'
    }
  };
  selection['Select'] = 'ALL_ATTRIBUTES';
  
  dynamodb.query(selection, function cbFindRefreshToken(err, data) {
    if (err) {
      return done(err, null);
    } else if (utils.isEmpty(data.Items)) {
      // not authorize yet
      return done({ message : 'Invalid Refresh Token' }, null);
    } else {
      // authorized
      var result = {};
      result.user_id = data.Items[0].user_id['S'];
      result.client_id = data.Items[0].client_id['S'];
      result.scope = data.Items[0].scope['SS'];
      return done(null, result);
    }
  });
}

exports.save = function(user_id, client_id, access_token, expires, refresh_token, scope, done) {
  var dynamodb = new global.aws.DynamoDB();
  var selection = {
    TableName:'OAuth2Authorization'
  };

  selection['Key'] = {
    'user_id': {
      'S': user_id
    },
    'client_id': {
      'S': client_id
    }
  };
  
  selection['AttributeUpdates'] = {
    'access_token': {
      'Action': 'PUT',
      'Value': {
        'S': access_token
      }
    },
    'expires': {
      'Action': 'PUT',
      'Value': {
        'N': expires
      }
    },
    'scope': {
      'Action': 'ADD',
      'Value': {
        'SS': scope
      }
    },
    'refresh_token': {
      'Action': 'PUT',
      'Value': {
        'S': refresh_token
      }
    }
  };
  
  selection['ReturnValues'] = 'ALL_NEW';
  dynamodb.updateItem(selection, function cbRefrsh(err, data) {
    if (done) {
      if (err) {
        return done(err, null);
      } else {
        // authorized
        var result = {};
        result.user_id = data.Item.user_id['S'];
        result.client_id = data.Item.client_id['S'];
        result.access_token = data.Item.access_token['S'];
        result.expires = data.Item.expires['N'];
        result.scope = data.Item.scope['SS'];
        
        return done(null, result);
      }
    }
  });
}