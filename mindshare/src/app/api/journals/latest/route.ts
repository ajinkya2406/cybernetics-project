import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json({ snippet: "Grateful for small moments today..." });
}
