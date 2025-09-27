const { PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, ok, created, badRequest, serverError } = require("../../lib/dynamo.js");
const { v4: uuid } = require("uuid");

const MOODS_TABLE = process.env.MOODS_TABLE || "Moods";
const JOURNALS_TABLE = process.env.JOURNALS_TABLE || "Journals";

async function addMood(event) {
	try {
		const body = JSON.parse(event.body || "{}");
		console.log("AddMood request body:", body);
		const { userId, mood, note } = body;
		if (!userId || !mood) {
			console.log("Missing required fields - userId:", userId, "mood:", mood);
			return badRequest("userId and mood are required");
		}
		
		const moodId = uuid();
		const now = new Date().toISOString();
		const item = { moodId, userId, mood, note, date: now };
		console.log("Saving mood item:", item);
		await ddb.send(new PutCommand({ TableName: MOODS_TABLE, Item: item }));
		console.log("Mood saved successfully");
		return created(item);
	} catch (e) {
		console.error("Error in addMood:", e);
		return serverError(e);
	}
}

async function getMoodTrendsByUser(event) {
	try {
		const { userId } = event.pathParameters || {};
		console.log("GetMoodTrendsByUser - userId:", userId);
		if (!userId) return badRequest("userId is required");
		
		const res = await ddb.send(new ScanCommand({
			TableName: MOODS_TABLE,
			FilterExpression: "userId = :userId",
			ExpressionAttributeValues: { ":userId": userId }
		}));
		console.log("Mood trends query result:", res.Items);
		return ok(res.Items || []);
	} catch (e) {
		console.error("Error in getMoodTrendsByUser:", e);
		return serverError(e);
	}
}

async function getAllMoodsByUser(event) {
	try {
		const { userId } = event.pathParameters || {};
		console.log("GetAllMoodsByUser - userId:", userId);
		console.log("MOODS_TABLE:", MOODS_TABLE);
		console.log("JOURNALS_TABLE:", JOURNALS_TABLE);
		if (!userId) return badRequest("userId is required");
		
		// Get moods from moods table
		console.log("Scanning moods table...");
		const moodsRes = await ddb.send(new ScanCommand({
			TableName: MOODS_TABLE,
			FilterExpression: "userId = :userId",
			ExpressionAttributeValues: { ":userId": userId }
		}));
		console.log("Moods table result:", moodsRes.Items?.length || 0, "items");
		
		// Get moods from journal entries
		console.log("Scanning journals table...");
		const journalsRes = await ddb.send(new ScanCommand({
			TableName: JOURNALS_TABLE,
			FilterExpression: "userId = :userId AND attribute_exists(mood) AND mood <> :empty",
			ExpressionAttributeValues: { 
				":userId": userId,
				":empty": ""
			}
		}));
		console.log("Journals table result:", journalsRes.Items?.length || 0, "items");
		
		// Combine and format all moods
		const allMoods = [];
		
		// Add moods from moods table
		if (moodsRes.Items) {
			moodsRes.Items.forEach(mood => {
				allMoods.push({
					moodId: mood.moodId,
					userId: mood.userId,
					mood: mood.mood,
					note: mood.note,
					date: mood.date,
					source: 'manual'
				});
			});
		}
		
		// Add moods from journal entries
		if (journalsRes.Items) {
			journalsRes.Items.forEach(journal => {
				allMoods.push({
					moodId: `journal_${journal.journalId}`,
					userId: journal.userId,
					mood: journal.mood,
					note: `From journal: "${journal.content?.substring(0, 50)}${journal.content?.length > 50 ? '...' : ''}"`,
					date: journal.createdAt,
					source: 'journal'
				});
			});
		}
		
		// Sort by date (newest first)
		allMoods.sort((a, b) => new Date(b.date) - new Date(a.date));
		
		console.log("All moods combined:", allMoods.length);
		return ok(allMoods);
	} catch (e) {
		console.error("Error in getAllMoodsByUser:", e);
		return serverError(e);
	}
}

async function updateMood(event) {
	try {
		const { moodId } = event.pathParameters || {};
		if (!moodId) return badRequest("moodId is required");
		
		const body = JSON.parse(event.body || "{}");
		const { mood, note } = body;
		
		const updateExpression = [];
		const expressionAttributeNames = {};
		const expressionAttributeValues = {};
		
		if (mood !== undefined) {
			updateExpression.push("#mood = :mood");
			expressionAttributeNames["#mood"] = "mood";
			expressionAttributeValues[":mood"] = mood;
		}
		
		if (note !== undefined) {
			updateExpression.push("#note = :note");
			expressionAttributeNames["#note"] = "note";
			expressionAttributeValues[":note"] = note;
		}
		
		if (updateExpression.length === 0) {
			return badRequest("No fields to update");
		}
		
		const res = await ddb.send(new UpdateCommand({
			TableName: MOODS_TABLE,
			Key: { moodId },
			UpdateExpression: "SET " + updateExpression.join(", "),
			ExpressionAttributeNames: expressionAttributeNames,
			ExpressionAttributeValues: expressionAttributeValues,
			ReturnValues: "ALL_NEW"
		}));
		
		return ok(res.Attributes);
	} catch (e) {
		return serverError(e);
	}
}

// Get latest mood for dashboard
async function getLatestMood(event) {
	try {
		// Get the most recent mood from all moods
		const res = await ddb.send(new ScanCommand({ 
			TableName: MOODS_TABLE,
			Limit: 1,
			ScanIndexForward: false
		}));
		
		if (!res.Items || res.Items.length === 0) {
			return ok({ summary: "No mood data yet. Track your mood!" });
		}
		
		const latestMood = res.Items[0];
		const summary = `Latest mood: ${latestMood.mood}${latestMood.note ? ` - ${latestMood.note}` : ''}`;
		return ok({ summary });
	} catch (e) {
		console.error("Error in getLatestMood:", e);
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
	addMood,
	getMoodTrendsByUser,
	getAllMoodsByUser,
	updateMood,
	getLatestMood,
	options
};