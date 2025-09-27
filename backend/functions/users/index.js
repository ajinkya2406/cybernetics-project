const { PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, ok, created, badRequest, serverError } = require("../../lib/dynamo.js");
const { v4: uuid } = require("uuid");

const TABLE = process.env.USERS_TABLE || "Users";

async function createUser(event) {
	try {
		const body = JSON.parse(event.body || "{}");
		const { email, displayName, avatarUrl } = body;
		if (!email) return badRequest("email is required");

		// First, try to find existing user by email
		const existingUsers = await ddb.send(new ScanCommand({
			TableName: TABLE,
			FilterExpression: "email = :email",
			ExpressionAttributeValues: { ":email": email }
		}));

		if (existingUsers.Items && existingUsers.Items.length > 0) {
			// User exists, update lastLogin and return existing user
			const existingUser = existingUsers.Items[0];
			const now = new Date().toISOString();
			const updatedUser = {
				...existingUser,
				displayName: displayName || existingUser.displayName,
				originalName: existingUser.originalName || existingUser.displayName,
				anonymousName: existingUser.anonymousName || `Anonymous_${Math.random().toString(36).substr(2, 9)}`,
				avatarUrl: avatarUrl || existingUser.avatarUrl,
				lastLogin: now
			};
			await ddb.send(new PutCommand({ TableName: TABLE, Item: updatedUser }));
			return ok(updatedUser);
		} else {
			// User doesn't exist, create new one
			const userId = uuid();
			const now = new Date().toISOString();
			const originalName = displayName || "Mind User";
			const anonymousName = `Anonymous_${Math.random().toString(36).substr(2, 9)}`;
			const item = { 
				userId, 
				email, 
				displayName: originalName, 
				originalName: originalName,
				anonymousName: anonymousName,
				avatarUrl, 
				createdAt: now, 
				lastLogin: now 
			};
			await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
			return created(item);
		}
	} catch (e) {
		return serverError(e);
	}
}

async function getUserById(event) {
	try {
		const { userId } = event.pathParameters || {};
		if (!userId) return badRequest("userId is required");
		const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { userId } }));
		if (!res.Item) return ok(null);
		return ok(res.Item);
	} catch (e) {
		return serverError(e);
	}
}

async function updateUser(event) {
	try {
		const { userId } = event.pathParameters || {};
		if (!userId) return badRequest("userId is required");
		const body = JSON.parse(event.body || "{}");
		console.log("Update user request body:", body);
		const { displayName, avatarUrl, originalName, anonymousName } = body;
		if (displayName === undefined && avatarUrl === undefined && originalName === undefined && anonymousName === undefined) {
			return badRequest("nothing to update");
		}
		let UpdateExpression = "set ";
		const ExpressionAttributeNames = {};
		const ExpressionAttributeValues = {};
		if (displayName !== undefined) {
			UpdateExpression += "#dn = :dn, ";
			ExpressionAttributeNames["#dn"] = "displayName";
			ExpressionAttributeValues[":dn"] = displayName;
		}
		if (originalName !== undefined) {
			UpdateExpression += "#on = :on, ";
			ExpressionAttributeNames["#on"] = "originalName";
			ExpressionAttributeValues[":on"] = originalName;
		}
		if (anonymousName !== undefined) {
			UpdateExpression += "#an = :an, ";
			ExpressionAttributeNames["#an"] = "anonymousName";
			ExpressionAttributeValues[":an"] = anonymousName;
		}
		if (avatarUrl !== undefined) {
			UpdateExpression += "#av = :av, ";
			ExpressionAttributeNames["#av"] = "avatarUrl";
			ExpressionAttributeValues[":av"] = avatarUrl;
		}
		UpdateExpression = UpdateExpression.replace(/,\s*$/, "");
		const res = await ddb.send(new UpdateCommand({
			TableName: TABLE,
			Key: { userId },
			UpdateExpression,
			ExpressionAttributeNames,
			ExpressionAttributeValues,
			ReturnValues: "ALL_NEW",
		}));
		
		// If displayName or anonymousName was updated, also update it in all existing journal entries
		if (displayName || anonymousName) {
			try {
				const { ScanCommand, UpdateCommand: JournalUpdateCommand } = require("@aws-sdk/lib-dynamodb");
				const { ddb: journalDdb } = require("../../lib/dynamo.js");
				
				// Find all journals for this user
				const journalRes = await journalDdb.send(new ScanCommand({
					TableName: process.env.JOURNALS_TABLE || "Journals",
					FilterExpression: "userId = :userId",
					ExpressionAttributeValues: { ":userId": userId }
				}));
				
				// Update displayName in all journal entries
				if (journalRes.Items && journalRes.Items.length > 0) {
					const updatePromises = journalRes.Items.map(journal => {
						let updateExpression = "set ";
						let expressionValues = {};
						
						// Update displayName for all journals
						if (displayName) {
							updateExpression += "displayName = :dn, ";
							expressionValues[":dn"] = displayName;
						}
						
						// Update displayName to anonymousName for anonymous journals
						if (anonymousName && journal.privacy === "anonymous") {
							updateExpression += "displayName = :an, ";
							expressionValues[":an"] = anonymousName;
						}
						
						// Remove trailing comma
						updateExpression = updateExpression.replace(/,\s*$/, "");
						
						if (Object.keys(expressionValues).length > 0) {
							return journalDdb.send(new JournalUpdateCommand({
								TableName: process.env.JOURNALS_TABLE || "Journals",
								Key: { journalId: journal.journalId },
								UpdateExpression: updateExpression,
								ExpressionAttributeValues: expressionValues
							}));
						}
						return Promise.resolve();
					});
					
					await Promise.all(updatePromises.filter(p => p));
				}
			} catch (journalError) {
				console.error("Error updating journal displayNames:", journalError);
				// Don't fail the user update if journal update fails
			}
		}
		
		return ok(res.Attributes);
	} catch (e) {
		return serverError(e);
	}
}

async function logout(event) {
	try {
		const body = JSON.parse(event.body || "{}");
		const { userId } = body;
		if (!userId) return badRequest("userId is required");
		const now = new Date().toISOString();
		const res = await ddb.send(new UpdateCommand({
			TableName: TABLE,
			Key: { userId },
			UpdateExpression: "set #ll = :ll",
			ExpressionAttributeNames: { "#ll": "lastLogin" },
			ExpressionAttributeValues: { ":ll": now },
			ReturnValues: "ALL_NEW",
		}));
		return ok(res.Attributes);
	} catch (e) {
		return serverError(e);
	}
}

// CORS preflight handler
async function options(event) {
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
		},
		body: ""
	};
}

module.exports = {
	createUser,
	getUserById,
	updateUser,
	logout,
	options
};
