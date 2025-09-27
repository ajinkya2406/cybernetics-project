import express from 'express';
import cors from 'cors';
import { v4 as uuid } from 'uuid';

const app = express();
const PORT = 3001;

// In-memory storage for development
const users = new Map();
const journals = new Map();
const moods = new Map();
const interactions = new Map();

app.use(cors());
app.use(express.json());

// Helper functions
const json = (status, body) => ({ statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const ok = (data) => json(200, { success: true, data });
const created = (data) => json(201, { success: true, data });
const badRequest = (message) => json(400, { success: false, error: message });
const serverError = (error) => json(500, { success: false, error: error?.message || "Internal Server Error" });

// Users endpoints
app.post('/api/users', (req, res) => {
  try {
    const { email, displayName, avatarUrl } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "email is required" });
    
    const userId = uuid();
    const now = new Date().toISOString();
    const user = { userId, email, displayName: displayName || "Mind User", avatarUrl, createdAt: now, lastLogin: now };
    users.set(userId, user);
    res.status(201).json({ success: true, data: user });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || "Internal Server Error" });
  }
});

app.get('/api/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = users.get(userId);
    res.json(ok(user || null));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

app.patch('/api/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, avatarUrl } = req.body;
    if (!displayName && !avatarUrl) return res.status(400).json(badRequest("nothing to update"));
    
    const user = users.get(userId);
    if (!user) return res.status(404).json(badRequest("user not found"));
    
    if (displayName) user.displayName = displayName;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    
    res.json(ok(user));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

app.post('/api/logout', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json(badRequest("userId is required"));
    
    const user = users.get(userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
    }
    res.json(ok(user));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

// Journals endpoints
app.post('/api/journals', (req, res) => {
  try {
    const { userId, content, mood, attachments = [], privacy = "private" } = req.body;
    if (!userId || !content) return res.status(400).json({ success: false, error: "userId and content are required" });
    
    const journalId = uuid();
    const now = new Date().toISOString();
    const journal = { journalId, userId, content, mood, attachments, privacy, createdAt: now };
    journals.set(journalId, journal);
    res.status(201).json({ success: true, data: journal });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || "Internal Server Error" });
  }
});

app.get('/api/journals/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userJournals = Array.from(journals.values()).filter(j => j.userId === userId);
    res.json({ success: true, data: userJournals });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || "Internal Server Error" });
  }
});

app.get('/api/journals', (req, res) => {
  try {
    const { privacy } = req.query;
    let items = Array.from(journals.values());
    if (privacy === "anonymous") {
      items = items.filter(j => j.privacy === "anonymous");
    }
    res.json(ok({ items }));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

app.patch('/api/journals/:journalId', (req, res) => {
  try {
    const { journalId } = req.params;
    const { content, mood, attachments, privacy } = req.body;
    if (!content && !mood && !attachments && !privacy) return res.status(400).json(badRequest("nothing to update"));
    
    const journal = journals.get(journalId);
    if (!journal) return res.status(404).json(badRequest("journal not found"));
    
    if (content) journal.content = content;
    if (mood) journal.mood = mood;
    if (attachments) journal.attachments = attachments;
    if (privacy) journal.privacy = privacy;
    
    res.json(ok(journal));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

app.delete('/api/journals/:journalId', (req, res) => {
  try {
    const { journalId } = req.params;
    journals.delete(journalId);
    res.json(ok({ deleted: true }));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

// Moods endpoints
app.post('/api/moods', (req, res) => {
  try {
    const { userId, mood, date, note } = req.body;
    if (!userId || !mood) return res.status(400).json(badRequest("userId and mood are required"));
    
    const moodId = uuid();
    const moodEntry = { moodId, userId, mood, date: date || new Date().toISOString(), note };
    moods.set(moodId, moodEntry);
    res.status(201).json(created(moodEntry));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

app.get('/api/moods/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userMoods = Array.from(moods.values()).filter(m => m.userId === userId);
    res.json(ok({ items: userMoods }));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

app.patch('/api/moods/:moodId', (req, res) => {
  try {
    const { moodId } = req.params;
    const { mood, note, date } = req.body;
    if (!mood && !note && !date) return res.status(400).json(badRequest("nothing to update"));
    
    const moodEntry = moods.get(moodId);
    if (!moodEntry) return res.status(404).json(badRequest("mood not found"));
    
    if (mood) moodEntry.mood = mood;
    if (note) moodEntry.note = note;
    if (date) moodEntry.date = date;
    
    res.json(ok(moodEntry));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

// Interactions endpoints
app.post('/api/interactions', (req, res) => {
  try {
    const { journalId, userId, type, content } = req.body;
    if (!journalId || !userId || !type) return res.status(400).json(badRequest("journalId, userId, type required"));
    
    const interactionId = uuid();
    const interaction = { interactionId, journalId, userId, type, content, createdAt: new Date().toISOString() };
    interactions.set(interactionId, interaction);
    res.status(201).json(created(interaction));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

app.get('/api/interactions/journal/:journalId', (req, res) => {
  try {
    const { journalId } = req.params;
    const journalInteractions = Array.from(interactions.values()).filter(i => i.journalId === journalId);
    res.json(ok(journalInteractions));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

app.get('/api/interactions/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userInteractions = Array.from(interactions.values()).filter(i => i.userId === userId);
    res.json(ok(userInteractions));
  } catch (e) {
    res.status(500).json(serverError(e));
  }
});

// Latest endpoints for dashboard
app.get('/api/journals/latest', (req, res) => {
  res.json(ok({ snippet: "Grateful for small moments today..." }));
});

app.get('/api/moods/latest', (req, res) => {
  res.json(ok({ summary: "You felt calm yesterday. Keep it up!" }));
});

app.listen(PORT, () => {
  console.log(`🚀 Local backend server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoints available at http://localhost:${PORT}/api/`);
});
