"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import AnonymousMode from "@/components/ui/AnonymousMode";
import { signIn } from "next-auth/react";

export default function LoginPage() {
	const router = useRouter();
	const [displayName, setDisplayName] = useState("");
	const [loading, setLoading] = useState(false);
	const [showAnonymous, setShowAnonymous] = useState(false);

	async function handleGoogleLogin() {
		setLoading(true);
		try {
			await signIn("google", { callbackUrl: "/dashboard" });
		} finally {
			setLoading(false);
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		await handleGoogleLogin();
	}

	function handleAnonymousLogin(username: string) {
		// Store anonymous user info in localStorage
		localStorage.setItem('anonymousUser', JSON.stringify({
			displayName: username,
			isAnonymous: true
		}));
		router.push('/feed');
	}

	if (showAnonymous) {
		return (
			<div className="min-h-screen relative overflow-hidden">
				{/* Background with gradient and geometric shapes */}
				<div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-800 to-blue-400">
					{/* Geometric shapes */}
					<div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
					<div className="absolute top-20 right-20 w-24 h-24 bg-white/10 rounded-lg blur-xl"></div>
					<div className="absolute bottom-20 left-16 w-28 h-28 bg-white/10 rounded-full blur-xl"></div>
					<div className="absolute bottom-16 right-12 w-20 h-20 bg-white/10 rounded-lg blur-xl"></div>
					
					{/* Watermark text */}
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-[12rem] md:text-[16rem] font-bold text-white/5 select-none pointer-events-none">
							MINDSHARE
						</div>
					</div>
				</div>
				
				{/* Content */}
				<div className="relative z-10 min-h-screen flex items-center justify-center p-8">
					<div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl p-12 w-full max-w-lg shadow-2xl">
						<AnonymousMode onEnterAnonymous={handleAnonymousLogin} />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen relative overflow-hidden">
			{/* Background with gradient and geometric shapes */}
			<div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-800 to-blue-400">
				{/* Geometric shapes */}
				<div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
				<div className="absolute top-20 right-20 w-24 h-24 bg-white/10 rounded-lg blur-xl"></div>
				<div className="absolute bottom-20 left-16 w-28 h-28 bg-white/10 rounded-full blur-xl"></div>
				<div className="absolute bottom-16 right-12 w-20 h-20 bg-white/10 rounded-lg blur-xl"></div>
				
				{/* Watermark text */}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="text-[12rem] md:text-[16rem] font-bold text-white/5 select-none pointer-events-none">
						MINDSHARE
					</div>
				</div>
			</div>
			
			{/* Content */}
			<div className="relative z-10 min-h-screen flex items-center justify-center p-8">
				<div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl p-12 w-full max-w-lg shadow-2xl">
					{/* Header */}
					<div className="text-center mb-12">
						<h1 className="text-4xl font-bold text-white mb-4">Welcome Back</h1>
						<p className="text-white/80 text-lg">Sign in to continue your journey</p>
					</div>
					
					{/* Buttons */}
					<div className="space-y-6">
						{/* Google Login Button */}
						<button
							onClick={handleGoogleLogin}
							disabled={loading}
							className="w-full h-14 inline-flex items-center justify-center gap-4 rounded-2xl bg-white hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
						>
							{/* Google Logo */}
							<svg className="w-6 h-6" viewBox="0 0 24 24">
								<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
								<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
								<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
								<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
							</svg>
							<span className="text-gray-800 font-semibold text-lg">Continue with Google</span>
						</button>
						
						{/* Separator */}
						<div className="relative my-8">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-white/30" />
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-4 bg-transparent text-white/70 font-medium">or</span>
							</div>
						</div>
						
						{/* Anonymous Button */}
						<button
							onClick={() => setShowAnonymous(true)}
							className="w-full h-14 inline-flex items-center justify-center gap-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-white/30 text-white transition-all duration-200 backdrop-blur-sm hover:shadow-xl transform hover:scale-[1.02]"
						>
							{/* Anonymous Icon */}
							<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
							</svg>
							<span className="font-semibold text-lg">Browse Anonymously</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
