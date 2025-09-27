import { NextResponse } from "next/server";

type Journal = {
	id: string;
	userId?: string;
	displayName?: string;
	content: string;
	mood?: string;
	privacy: "private" | "anonymous";
	createdAt: number;
};

let JOURNALS: Journal[] = [];

export async function POST(req: Request) {
	const body = await req.json();
	const j: Journal = {
		id: Math.random().toString(36).slice(2),
		content: body.content ?? "",
		mood: body.mood ?? "",
		privacy: body.privacy === "anonymous" ? "anonymous" : "private",
		createdAt: Date.now(),
		displayName: body.displayName ?? "Anon",
	};
	JOURNALS.unshift(j);
	return NextResponse.json(j);
}

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const privacy = searchParams.get("privacy");
	let items = JOURNALS;
	if (privacy === "anonymous") items = items.filter((j) => j.privacy === "anonymous");
	return NextResponse.json({ items });
}
