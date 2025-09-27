"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiPatch, apiPost } from "@/lib/api";
import toast from "react-hot-toast";

export default function ProfilePage() {
	const { data: session } = useSession();
	const [user, setUser] = useState<{ userId: string; displayName: string; avatarUrl?: string } | null>(null);
	const [name, setName] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		async function loadUser() {
			if (!session?.user?.email) return;
			
			try {
				// Get or create user first
				const userResponse = await apiPost<{ data: { displayName: string; avatarUrl: string; userId: string; originalName?: string; anonymousName?: string } }>("/api/users", { 
					email: session.user.email, 
					displayName: session.user.name,
					avatarUrl: session.user.image 
				});
				setUser(userResponse.data);
				setName(userResponse.data.displayName);
			} catch (e) {
				console.error("Failed to load user:", e);
			}
		}
		
		loadUser();
	}, [session]);

	async function save() {
		if (!user) return;
		setLoading(true);
		try {
		const updatedUser = await apiPatch<{ data: { displayName: string; avatarUrl: string; userId: string; originalName?: string; anonymousName?: string } }>(`/api/users/${user.userId}`, { displayName: name });
		setUser(updatedUser.data);
			toast.success("Display name updated!");
		} catch (e: any) {
			toast.error(e?.message ?? "Failed to update");
		} finally {
			setLoading(false);
		}
	}

	async function logout() {
		await apiPost("/api/logout", {});
		localStorage.removeItem("mindshare_user");
		location.href = "/login";
	}

	return (
		<div className="mx-auto w-full max-w-xl px-4 md:px-6 py-6 space-y-4">
			<div className="text-center">
				<div className="h-20 w-20 rounded-full bg-slate-200 mx-auto grid place-items-center">{user?.avatarUrl ? "" : "🙂"}</div>
				<p className="mt-2 font-medium text-slate-800">{user?.displayName}</p>
			</div>
			<Card className="p-4 space-y-3">
				<div>
					<label className="text-sm text-slate-600">Change Display Name</label>
					<input className="w-full h-10 mt-1 rounded-xl border border-slate-300 px-3" value={name} onChange={(e) => setName(e.target.value)} />
				</div>
				<Button onClick={save} full variant="secondary" disabled={loading}>
					{loading ? "Saving..." : "Save"}
				</Button>
			</Card>
			<Card className="p-4 space-y-3">
				<Button variant="ghost" full>Change Avatar</Button>
				<Button variant="ghost" full>Privacy Settings</Button>
				<Button variant="danger" onClick={logout} full>Logout</Button>
			</Card>
		</div>
	);
}
