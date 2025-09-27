import { NextResponse } from "next/server";

type Mood = { id: string; mood: string; note?: string; date: string; score: number };
const MOODS: Mood[] = [
	{ id: "1", mood: "neutral", date: "2025-09-20", score: 3 },
	{ id: "2", mood: "calm", date: "2025-09-21", score: 4 },
	{ id: "3", mood: "happy", date: "2025-09-22", score: 5 },
	{ id: "4", mood: "sad", date: "2025-09-23", score: 2 },
	{ id: "5", mood: "neutral", date: "2025-09-24", score: 3 },
];

export async function GET() {
	return NextResponse.json({ items: MOODS });
}

export async function POST(req: Request) {
	const body = await req.json();
	const scores: Record<string, number> = { happy: 5, calm: 4, neutral: 3, anxious: 2, sad: 1 };
	const mood: Mood = {
		id: Math.random().toString(36).slice(2),
		mood: body.mood ?? "neutral",
		note: body.note,
		date: new Date().toISOString().slice(0, 10),
		score: scores[body.mood] ?? 3,
	};
	MOODS.push(mood);
	return NextResponse.json(mood);
}
