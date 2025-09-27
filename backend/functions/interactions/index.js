const { PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, ok, created, badRequest, serverError } = require("../../lib/dynamo.js");
const { v4: uuid } = require("uuid");

const TABLE = process.env.INTERACTIONS_TABLE || "Interactions";

async function addInteraction(event) {
	try {
		const body = JSON.parse(event.body || "{}");
		const { journalId, userId, type, content, action } = body;
		if (!journalId || !userId || !type) return badRequest("journalId, userId, and type are required");
		
		// For likes, check if it's an add or remove action
		if (type === "like" && action === "remove") {
			// Find and delete existing like
			const existingLikes = await ddb.send(new ScanCommand({
				TableName: TABLE,
				FilterExpression: "journalId = :journalId AND userId = :userId AND #type = :type",
				ExpressionAttributeNames: { "#type": "type" },
				ExpressionAttributeValues: { 
					":journalId": journalId, 
					":userId": userId, 
					":type": "like" 
				}
			}));
			
			if (existingLikes.Items && existingLikes.Items.length > 0) {
				// Delete the first like found
				await ddb.send(new DeleteCommand({
					TableName: TABLE,
					Key: { interactionId: existingLikes.Items[0].interactionId }
				}));
				return ok({ message: "Like removed", action: "removed" });
			}
			return ok({ message: "No like found to remove" });
		}
		
		// For adding likes or comments
		const interactionId = uuid();
		const now = new Date().toISOString();
		const item = { interactionId, journalId, userId, type, content, createdAt: now };
		await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
		return created(item);
	} catch (e) {
		return serverError(e);
	}
}

async function getInteractionsByJournal(event) {
	try {
		const { journalId } = event.pathParameters || {};
		if (!journalId) return badRequest("journalId is required");
		
		const res = await ddb.send(new ScanCommand({
			TableName: TABLE,
			FilterExpression: "journalId = :journalId",
			ExpressionAttributeValues: { ":journalId": journalId }
		}));
		return ok(res.Items || []);
	} catch (e) {
		return serverError(e);
	}
}

async function getInteractionsByUser(event) {
	try {
		const { userId } = event.pathParameters || {};
		if (!userId) return badRequest("userId is required");
		
		const res = await ddb.send(new ScanCommand({
			TableName: TABLE,
			FilterExpression: "userId = :userId",
			ExpressionAttributeValues: { ":userId": userId }
		}));
		return ok(res.Items || []);
	} catch (e) {
		return serverError(e);
	}
}

async function getInteractionsForJournals(event) {
	try {
		const { journalIds } = JSON.parse(event.body || "{}");
		if (!journalIds || !Array.isArray(journalIds)) {
			return badRequest("journalIds array is required");
		}
		
		// Get all interactions for the provided journal IDs
		const orConditions = journalIds.map((_, index) => `journalId = :journalId${index}`).join(' OR ');
		const expressionValues = {};
		journalIds.forEach((journalId, index) => {
			expressionValues[`:journalId${index}`] = journalId;
		});
		
		const res = await ddb.send(new ScanCommand({
			TableName: TABLE,
			FilterExpression: orConditions,
			ExpressionAttributeValues: expressionValues
		}));
		
		// Group interactions by journalId
		const groupedInteractions = {};
		(res.Items || []).forEach(interaction => {
			if (!groupedInteractions[interaction.journalId]) {
				groupedInteractions[interaction.journalId] = { likes: [], comments: [] };
			}
			if (interaction.type === 'like') {
				groupedInteractions[interaction.journalId].likes.push(interaction);
			} else if (interaction.type === 'comment') {
				groupedInteractions[interaction.journalId].comments.push(interaction);
			}
		});
		
		return ok(groupedInteractions);
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
	addInteraction,
	getInteractionsByJournal,
	getInteractionsByUser,
	getInteractionsForJournals,
	options
};