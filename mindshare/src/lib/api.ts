const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://xch4dunmjl.execute-api.us-east-1.amazonaws.com";

export async function apiGet<T>(path: string): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(`HTTP ${res.status}: ${errorText}`);
	}
	const data = await res.json();
	return data;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}
