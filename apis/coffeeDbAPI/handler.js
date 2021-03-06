'use strict';
// Create, Read, Update, Delete

const uuid = require('uuid');
const AWS = require('aws-sdk'); 

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const Create = (evt, ctx, cb) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(evt.body);
  console.log(data);
  try {
    if (Object.keys(data).length === 0) {
      throw new Error('Empty message body or does not parse to JSON');
    }
    if (!data.roaster || typeof data.roaster !== 'string' || data.roaster.length <= 0) {
      throw new Error(`Roaster must be provided and be of type string`)
    }
    if (!data.country || typeof data.country !== 'string' || data.country.length <= 0) {
      throw new Error(`Country must be input as a string`);
    }
    if (data.name && typeof data.name !== 'string') {
        throw new Error(`name must be input as a string or blank`);
      }
    if (data.producer && typeof data.producer !== 'string') {
        throw new Error(`producer must be input as a string or blank`);
      }
    if (data.processing && typeof data.processing !== 'string') {
        throw new Error(`processing must be input as a string or blank`);
      }
    if (data.masl && typeof data.masl !== 'number') {
      throw new Error(`MASL must be a number`)
    }
    if (data.varietals && Array.isArray(data.varietals) === false) {
      throw new Error('Varietals must be an array or nothing')
    }
    if (data.notes && Array.isArray(data.notes) === false) {
      throw new Error('Notes must be an array of stringss or nothing')
    }
  } catch (err) {
    cb(null, {
      statusCode: 400, 
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({"message":err.toString()}),
    })
  }

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: uuid.v1(),
      roaster: data.roaster,
      country: data.country,
      producer: data.producer,
      name: data.name,
      varietals: data.varietals,
      processing: data.processing,
      masl: data.masl,
      createdAt: timestamp,
      updatedAt: timestamp,
      notes: data.notes
    },
  };
  console.log(params);

  // write the coffee to the database
  dynamoDb.put(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      cb(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t Put the item in DynamoDB.',
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(params.Item),
    };
    cb(null, response);
  });
};

// currently a scan for ALL coffees in the db
const List = (evt, ctx, cb) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
  };
  dynamoDb.scan(params, (error, result) => {
    // handle potential errors
    if (error) {
      console.error(error);
      cb(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the list of coffees.',
      });
      return;
    }
    // create a response
    const response = {
      statusCode: 200,
      headers: {      
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(result.Items),
    };
    cb(null, response);
    return;
})
}

const Get = (evt, ctx, cb) => {
  const id = evt.pathParameters.id;
  console.log(id);
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: id
    }
  }
  console.log(params);

  dynamoDb.get(params, (error, result) => {
    if (error) {
      console.error(error);
      return cb(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t get the information for that coffee.',
      })
    }
    console.log(result);
    const response = {
      statusCode: 200,
      headers: {      
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result),
    };
    return cb(null, response)
  })
}


// finds all Coffees from a specific Roaster
const Query = (evt, ctx, cb) => {
  var roaster = evt.queryStringParameters.roaster;
  console.log(roaster);
  // Names with Spaces are sent with '_' and then removed by the API
  roaster = roaster.replace(/_/g, ' ');
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    IndexName: "roaster-index",
    KeyConditionExpression: `roaster = :a`,
    ExpressionAttributeValues: {
      ':a': roaster
    }
  }
  
  console.log(params);
  // fetch todo from the database
  dynamoDb.query(params, (error, result) => {
    // handle potential errors
    if (error) {
      console.error(error);
      cb(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the information for that coffee.',
      });
      return;
    }
    console.log(result);
    const response = {
      statusCode: 200,
      headers: {      
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(result),
    };
    cb(null, response);
    
  });
}


const Delete = (evt, ctx, cb) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: evt.pathParameters.id,
    },
  };
  console.log(params);
  // delete the todo from the database
  dynamoDb.delete(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      cb(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t remove that coffee.',
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify('You deleted the coffee'),
    };
    cb(null, response);
  });
};

const Update = (evt, ctx, cb) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(evt.body);
  const coffeeID = evt.pathParameters.id;
  console.log(data);
  // validation 
  // consider abstracting this into one helper function for both create and update because DRY
  try {
    if (Object.keys(data).length === 0) {
      throw new Error('Empty message body or does not parse to JSON');
    }
    if (data.roaster && typeof data.roaster !== 'string' && data.roaster.length <= 0) {
      throw new Error(`Roaster must be of type string`)
    }
    if (data.country && typeof data.country !== 'string' && data.country.length <= 0) {
      throw new Error(`Country must be input as a string`);
    }
    if (data.name && typeof data.name !== 'string') {
        throw new Error(`name must be input as a string or blank`);
      }
    if (data.producer && typeof data.producer !== 'string') {
        throw new Error(`producer must be input as a string or blank`);
      }
    if (data.processing && typeof data.processing !== 'string') {
        throw new Error(`processing must be input as a string or blank`);
      }
    if (data.masl && typeof data.masl !== 'number') {
      throw new Error(`MASL must be a number`)
    }
    if (data.varietals && Array.isArray(data.varietals) === false) {
      throw new Error('Varietals must be an array or nothing')
    }
    if (data.notes && Array.isArray(data.notes) === false) {
      throw new Error('Notes must be an array or nothing')
    }
  } catch (err) {
    cb(null, {
      statusCode: 400, 
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({"message":err.toString()}),
    })
  }


  const itemKeys = Object.keys(data)
  const updatedAt = timestamp;
  const possibleKeys = ['country','roaster','producer', 'name', 'masl', 'varietals', 'processing', 'notes'];
  let UpdateExpressionStatement = 'set #updatedAt = :updatedAt, ';
  let ExpressionAttributeNames = {'#updatedAt' : 'updatedAt'};
  let ExpressionAttributeValues = {":updatedAt": updatedAt};
  console.log(itemKeys);
  itemKeys.forEach(key => {
    // console.log(key)
    if(possibleKeys.includes(key)){
        UpdateExpressionStatement += `#${key} = :${key},`
        ExpressionAttributeNames[`#${key}`] = key;
        ExpressionAttributeValues[`:${key}`] = data[key];
    }  
})
  
UpdateExpressionStatement = UpdateExpressionStatement.slice(0, -1);

  const params = {
  TableName: process.env.DYNAMODB_TABLE,
  Key: {
    id: coffeeID
  },
  ExpressionAttributeNames,
  ExpressionAttributeValues,
  UpdateExpression: UpdateExpressionStatement,
  ReturnValues:"ALL_NEW"
};

  console.log(params);

  

  // update the todo in the database
  dynamoDb.update(params, (error, result) => {
    // handle potential errors
    if (error) {
      console.error(error);
      cb(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: `Couldn't update the coffee.`,
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {      
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      }
    };
    console.log(response);
    cb(null, response);
  });
}

const notGetHandlers = {
  "POST": Create,
  "DELETE": Delete,
  "PUT": Update
}



module.exports.coffeeInfo = (evt, ctx, cb) => {
  console.log(evt);
  console.log('----------------------------------------------------');
  console.log(evt.httpMethod);
  const httpMethod = evt.httpMethod;
  const queryStringParams = evt.queryStringParameters;
  console.log(queryStringParams);
  const evtPathParameters = evt.pathParameters;
  console.log(evtPathParameters);


  if(httpMethod != 'GET'){
    console.log('its geting inside the not Gets')
    return notGetHandlers[httpMethod](evt, ctx, cb);
  }
  if(httpMethod === 'GET'){
    console.log('making it to the GETS')
    if(queryStringParams){
      console.log('you got dem queryStringParams')
      return Query(evt, ctx, cb)
      }
    if(evtPathParameters){
      console.log('you got dem path params');
      return Get(evt, ctx, cb)
      }
    else{
      console.log('list em')
      return List(evt, ctx, cb)
      }
  }

const response = {
  statusCode: 405,
  headers: {
  "Access-Control-Allow-Origin" : "*",
  "Access-Control-Allow-Credentials" : true
  },
  body: JSON.stringify({
  message: `Invalid HTTP Method: ${httpMethod}`
  }),
};

cb(null, response);
}




