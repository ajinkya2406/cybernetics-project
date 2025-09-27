const { ok, badRequest, serverError } = require("../../lib/dynamo.js");

// Gemini AI integration
async function getWellnessTip(event) {
	try {
		console.log("getWellnessTip called with event:", JSON.stringify(event, null, 2));
		
		const { moodData, recentMoods } = JSON.parse(event.body || "{}");
		console.log("Parsed request data:", { moodData, recentMoods });
		
		// Prepare context for Gemini AI
		const context = {
			moodData: moodData || [],
			recentMoods: recentMoods || [],
			requestType: "wellness_tip"
		};
		
		const prompt = generateWellnessPrompt(context);
		console.log("Generated prompt:", prompt.substring(0, 300) + "...");
		
		const response = await callGeminiAI(prompt);
		console.log("Final response:", response);
		
		// Ensure response has required structure
		if (response && typeof response === 'object' && response.tip) {
			return ok(response);
		} else {
			console.log("Response missing tip, using fallback");
			return ok({
				tip: "Take a deep breath and remember that every day is a new opportunity to grow and heal.",
				action: "Practice 5 minutes of mindful breathing",
				mood_insight: "Focus on the present moment and your inner strength"
			});
		}
	} catch (e) {
		console.error("Error in getWellnessTip:", e);
		// Return fallback content
		return ok({
			tip: "Take a deep breath and remember that every day is a new opportunity to grow and heal.",
			action: "Practice 5 minutes of mindful breathing",
			mood_insight: "Focus on the present moment and your inner strength"
		});
	}
}

async function getMotivationalQuote(event) {
	try {
		console.log("getMotivationalQuote called with event:", JSON.stringify(event, null, 2));
		
		const { moodData, recentMoods } = JSON.parse(event.body || "{}");
		console.log("Parsed request data:", { moodData, recentMoods });
		
		// Prepare context for Gemini AI
		const context = {
			moodData: moodData || [],
			recentMoods: recentMoods || [],
			requestType: "motivational_quote"
		};
		
		const prompt = generateQuotePrompt(context);
		console.log("Generated prompt:", prompt.substring(0, 300) + "...");
		
		const response = await callGeminiAI(prompt);
		console.log("Final response:", response);
		
		// Ensure response has required structure
		if (response && typeof response === 'object' && response.quote) {
			return ok(response);
		} else {
			console.log("Response missing quote, using fallback");
			return ok({
				quote: "Every day is a new beginning. Take a deep breath and start again.",
				author: "AI Wisdom",
				context: "A gentle reminder of your resilience and potential"
			});
		}
	} catch (e) {
		console.error("Error in getMotivationalQuote:", e);
		// Return fallback content
		return ok({
			quote: "Every day is a new beginning. Take a deep breath and start again.",
			author: "AI Wisdom",
			context: "A gentle reminder of your resilience and potential"
		});
	}
}

function generateWellnessPrompt(context) {
	const { moodData, recentMoods } = context;
	
	// If no mood data, provide general wellness tips
	if (!moodData || moodData.length === 0) {
		const generalTips = [
			"Start your day with gratitude by writing down three things you're thankful for.",
			"Take a 5-minute mindful breathing break to center yourself.",
			"Practice self-compassion by treating yourself as you would a good friend.",
			"Connect with nature by spending time outdoors, even if just for a few minutes.",
			"Set a small, achievable goal for today to build momentum and confidence.",
			"Practice deep breathing exercises to reduce stress and increase calm.",
			"Write down your thoughts and feelings to process them better.",
			"Take a moment to appreciate the present moment and your surroundings.",
			"Engage in a creative activity that brings you joy.",
			"Reach out to someone you care about to strengthen your connections."
		];
		
		const randomTip = generalTips[Math.floor(Math.random() * generalTips.length)];
		
		return `You are a mental wellness AI assistant. The user is new and doesn't have mood tracking data yet. Provide a helpful wellness tip.

Please provide:
1. A general wellness tip: "${randomTip}"
2. A practical action they can take today
3. Keep it encouraging and supportive
4. Make it welcoming for someone starting their wellness journey
5. Keep the response under 200 words

Format your response as JSON:
{
  "tip": "Your personalized wellness tip here",
  "action": "A specific action they can take",
  "mood_insight": "Brief insight about starting their wellness journey"
}`;
	}
	
	let prompt = `You are a mental wellness AI assistant. Based on the user's mood tracking data, provide a personalized wellness tip.
	
User's recent moods: ${JSON.stringify(recentMoods)}
Mood data: ${JSON.stringify(moodData)}

Please provide:
1. A personalized wellness tip based on their mood patterns
2. A practical action they can take today
3. Keep it encouraging and supportive
4. Make it specific to their emotional state
5. Keep the response under 200 words

Format your response as JSON:
{
  "tip": "Your personalized wellness tip here",
  "action": "A specific action they can take",
  "mood_insight": "Brief insight about their mood pattern"
}`;

	return prompt;
}

function generateQuotePrompt(context) {
	const { moodData, recentMoods } = context;
	
	// If no mood data, provide general motivational quotes
	if (!moodData || moodData.length === 0) {
		const generalQuotes = [
			"Every new beginning comes from some other beginning's end.",
			"The only way to do great work is to love what you do.",
			"Success is not final, failure is not fatal: it is the courage to continue that counts.",
			"Believe you can and you're halfway there.",
			"The future belongs to those who believe in the beauty of their dreams.",
			"It is during our darkest moments that we must focus to see the light.",
			"The way to get started is to quit talking and begin doing.",
			"Life is what happens to you while you're busy making other plans.",
			"The only impossible journey is the one you never begin.",
			"Your limitation—it's only your imagination."
		];
		
		const randomQuote = generalQuotes[Math.floor(Math.random() * generalQuotes.length)];
		
		return `You are a motivational AI assistant. The user is new and doesn't have mood tracking data yet. Provide an inspiring motivational quote.

Please provide:
1. A beautiful motivational quote: "${randomQuote}"
2. Make it inspiring and uplifting
3. Make it welcoming for someone starting their journey
4. Keep the quote under 100 words

Format your response as JSON:
{
  "quote": "Your beautiful motivational quote here",
  "author": "Inspirational source or 'AI Wisdom'",
  "context": "Why this quote is perfect for them right now"
}`;
	}
	
	let prompt = `You are a motivational AI assistant. Based on the user's mood tracking data, provide a beautiful, personalized motivational quote.
	
User's recent moods: ${JSON.stringify(recentMoods)}
Mood data: ${JSON.stringify(moodData)}

Please provide:
1. A beautiful, personalized motivational quote
2. Make it relevant to their current emotional state
3. Keep it inspiring and uplifting
4. Make it feel personal and meaningful
5. Keep the quote under 100 words

Format your response as JSON:
{
  "quote": "Your beautiful motivational quote here",
  "author": "Inspirational source or 'AI Wisdom'",
  "context": "Why this quote is perfect for them right now"
}`;

	return prompt;
}

async function callGeminiAI(prompt) {
	try {
		console.log("Calling Gemini AI with prompt:", prompt.substring(0, 200) + "...");
		
		const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAp4hiA_VU1naqujutIs3GOfcQ2gzPnwa0";
		const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;
		
		const requestBody = {
			contents: [{
				parts: [{
					text: prompt
				}]
			}],
			generationConfig: {
				temperature: 0.7,
				topK: 40,
				topP: 0.95,
				maxOutputTokens: 1024,
			}
		};
		
		console.log("Making request to Gemini API...");
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody)
		});
		
		console.log("Gemini API response status:", response.status);
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error("Gemini API error response:", errorText);
			// Return a fallback structure instead of throwing
			return {
				tip: "Take a moment to breathe deeply and appreciate the present moment.",
				action: "Practice 5 minutes of mindful breathing",
				mood_insight: "Focus on your inner peace and strength"
			};
		}
		
		const data = await response.json();
		console.log("Gemini API response data:", JSON.stringify(data, null, 2));
		
		if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
			console.error("Invalid Gemini API response structure:", data);
			// Return a fallback structure instead of throwing
			return {
				tip: "Take a moment to breathe deeply and appreciate the present moment.",
				action: "Practice 5 minutes of mindful breathing",
				mood_insight: "Focus on your inner peace and strength"
			};
		}
		
		const generatedText = data.candidates[0].content.parts[0].text;
		console.log("Generated text from Gemini:", generatedText);
		
		// Try to parse as JSON, fallback to plain text
		try {
			const parsedResponse = JSON.parse(generatedText);
			console.log("Successfully parsed JSON response:", parsedResponse);
			return parsedResponse;
		} catch (parseError) {
			console.log("Failed to parse as JSON, using fallback structure");
			// If not JSON, wrap in a default structure based on content
			if (generatedText.toLowerCase().includes('quote') || generatedText.toLowerCase().includes('inspiration')) {
				return {
					quote: generatedText,
					author: "AI Wisdom",
					context: "AI-generated motivational guidance"
				};
			} else {
				return {
					tip: generatedText,
					action: "Take a moment to reflect on this message",
					mood_insight: "AI-generated wellness guidance"
				};
			}
		}
	} catch (error) {
		console.error("Error calling Gemini AI:", error);
		// Return a fallback structure instead of throwing
		return {
			tip: "Take a moment to breathe deeply and appreciate the present moment.",
			action: "Practice 5 minutes of mindful breathing",
			mood_insight: "Focus on your inner peace and strength"
		};
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
	getWellnessTip,
	getMotivationalQuote,
	options
};
