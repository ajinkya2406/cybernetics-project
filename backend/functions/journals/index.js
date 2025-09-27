const { PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, ok, created, badRequest, serverError } = require("../../lib/dynamo.js");
const { v4: uuid } = require("uuid");

const TABLE = process.env.JOURNALS_TABLE || "Journals";

async function createJournal(event) {
	try {
		const body = JSON.parse(event.body || "{}");
		const { userId, displayName, content, mood, attachments = [], privacy = "private" } = body;
		const cleanPrivacy = privacy?.trim() || "private";
		if (!userId || !content) return badRequest("userId and content are required");
		
		// Get user's anonymous name for community posts
		let finalDisplayName = displayName || "Anonymous";
		if (cleanPrivacy === "anonymous") {
			try {
				const { GetCommand } = require("@aws-sdk/lib-dynamodb");
				const userRes = await ddb.send(new GetCommand({
					TableName: process.env.USERS_TABLE || "Users",
					Key: { userId }
				}));
				if (userRes.Item?.anonymousName) {
					finalDisplayName = userRes.Item.anonymousName;
				}
			} catch (userError) {
				console.error("Error getting user anonymous name:", userError);
				// Fallback to provided displayName or "Anonymous"
			}
		}
		
		const journalId = uuid();
		const now = new Date().toISOString();
		const item = { 
			journalId, 
			userId, 
			displayName: finalDisplayName,
			content, 
			mood, 
			attachments, 
			privacy: cleanPrivacy, 
			createdAt: now 
		};
		await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
		return created(item);
	} catch (e) {
		return serverError(e);
	}
}

async function getJournalsByUser(event) {
	try {
		const { userId } = event.pathParameters || {};
		if (!userId) return badRequest("userId is required");
		const res = await ddb.send(new ScanCommand({
			TableName: TABLE,
			FilterExpression: "userId = :uid",
			ExpressionAttributeValues: { ":uid": userId }
		}));
		return ok(res.Items || []);
	} catch (e) {
		return serverError(e);
	}
}

async function getJournalsByEmail(event) {
	try {
		const { email } = event.queryStringParameters || {};
		if (!email) return badRequest("email is required");
		
		// First find the user by email
		const { ddb: userDdb } = require("../../lib/dynamo.js");
		const { ScanCommand: UserScanCommand } = require("@aws-sdk/lib-dynamodb");
		const userRes = await userDdb.send(new UserScanCommand({
			TableName: process.env.USERS_TABLE || "Users",
			FilterExpression: "email = :email",
			ExpressionAttributeValues: { ":email": email }
		}));
		
		if (!userRes.Items || userRes.Items.length === 0) {
			return ok([]);
		}
		
		// Get all userIds for this email (in case there are duplicates)
		const userIds = userRes.Items.map(user => user.userId);
		
		// Get journals for all userIds - need to use OR conditions
		const orConditions = userIds.map((_, index) => `userId = :userId${index}`).join(' OR ');
		const expressionValues = {};
		userIds.forEach((userId, index) => {
			expressionValues[`:userId${index}`] = userId;
		});
		
		const res = await ddb.send(new ScanCommand({
			TableName: TABLE,
			FilterExpression: orConditions,
			ExpressionAttributeValues: expressionValues
		}));
		
		// Sort by createdAt in descending order (newest first)
		const sortedItems = (res.Items || []).sort((a, b) => 
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
		
		return ok(sortedItems);
	} catch (e) {
		return serverError(e);
	}
}

async function getAnonymousJournals(event) {
	try {
		// Ideally query a GSI on privacy, but for demo we can Scan and filter
		const res = await ddb.send(new ScanCommand({ 
			TableName: TABLE, 
			FilterExpression: "begins_with(#p, :anon)", 
			ExpressionAttributeNames: { "#p": "privacy" }, 
			ExpressionAttributeValues: { ":anon": "anonymous" } 
		}));
		
		// Sort by createdAt in descending order (newest first)
		const sortedItems = (res.Items || []).sort((a, b) => 
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
		
		return ok(sortedItems);
	} catch (e) {
		return serverError(e);
	}
}

async function updateJournal(event) {
	try {
		const { journalId } = event.pathParameters || {};
		if (!journalId) return badRequest("journalId is required");
		const body = JSON.parse(event.body || "{}");
		const { content, mood, attachments, privacy } = body;
		if (!content && !mood && !attachments && !privacy) return badRequest("nothing to update");
		let UpdateExpression = "set ";
		const ExpressionAttributeNames = {};
		const ExpressionAttributeValues = {};
		if (content) { UpdateExpression += "#c = :c, "; ExpressionAttributeNames["#c"] = "content"; ExpressionAttributeValues[":c"] = content; }
		if (mood) { UpdateExpression += "#m = :m, "; ExpressionAttributeNames["#m"] = "mood"; ExpressionAttributeValues[":m"] = mood; }
		if (attachments) { UpdateExpression += "#a = :a, "; ExpressionAttributeNames["#a"] = "attachments"; ExpressionAttributeValues[":a"] = attachments; }
		if (privacy) { UpdateExpression += "#p = :p, "; ExpressionAttributeNames["#p"] = "privacy"; ExpressionAttributeValues[":p"] = privacy; }
		UpdateExpression = UpdateExpression.replace(/,\s*$/, "");
		const res = await ddb.send(new UpdateCommand({ TableName: TABLE, Key: { journalId }, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues, ReturnValues: "ALL_NEW" }));
		return ok(res.Attributes);
	} catch (e) {
		return serverError(e);
	}
}

async function deleteJournal(event) {
	try {
		const { journalId } = event.pathParameters || {};
		if (!journalId) return badRequest("journalId is required");
		await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { journalId } }));
		return ok({ deleted: true });
	} catch (e) {
		return serverError(e);
	}
}

// Get latest journal for dashboard
async function getLatestJournal(event) {
	try {
		// Get the most recent journal from all journals
		const res = await ddb.send(new ScanCommand({ 
			TableName: TABLE,
			Limit: 1,
			ScanIndexForward: false
		}));
		
		if (!res.Items || res.Items.length === 0) {
			return ok({ snippet: "No journals yet. Start writing!" });
		}
		
		const latestJournal = res.Items[0];
		const snippet = latestJournal.content ? latestJournal.content.substring(0, 100) + "..." : "No content";
		return ok({ snippet });
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
	createJournal,
	getJournalsByUser,
	getJournalsByEmail,
	getAnonymousJournals,
	updateJournal,
	deleteJournal,
	getLatestJournal,
	options
};
