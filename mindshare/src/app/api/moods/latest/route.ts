import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json({ summary: "You felt calm yesterday. Keep it up!" });
}
