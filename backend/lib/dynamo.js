const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
	region: process.env.AWS_REGION || 'us-east-1',
});

const ddb = DynamoDBDocumentClient.from(client, {
	marshallOptions: { removeUndefinedValues: true },
});

function json(status, body) {
	return {
		statusCode: status,
		headers: { 
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
		},
		body: JSON.stringify(body),
	};
}

function badRequest(message) {
	return json(400, { success: false, error: message });
}

function ok(data) {
	return json(200, { success: true, data });
}

function created(data) {
	return json(201, { success: true, data });
}

function serverError(error) {
	return json(500, { success: false, error: error?.message || "Internal Server Error" });
}

module.exports = {
	ddb,
	json,
	badRequest,
	serverError,
	ok,
	created
};
