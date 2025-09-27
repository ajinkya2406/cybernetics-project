import { NextResponse } from "next/server";
import { USERS } from "../_store";

export async function POST(req: Request) {
	const body = await req.json();
	const displayName: string = body.displayName || "Mind User";
	let user = USERS.find((u) => u.displayName === displayName);
	if (!user) {
		user = { id: Math.random().toString(36).slice(2), displayName };
		USERS.push(user);
	}
	return NextResponse.json(user);
}
