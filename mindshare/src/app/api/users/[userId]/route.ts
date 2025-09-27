import { NextResponse } from "next/server";
import { USERS } from "../../_store";

export async function PATCH(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
	const body = await _req.json();
	const params = await ctx.params;
	const user = USERS.find((u) => u.id === params.userId);
	if (!user) return new NextResponse("Not Found", { status: 404 });
	if (typeof body.displayName === "string") user.displayName = body.displayName;
	return NextResponse.json(user);
}
