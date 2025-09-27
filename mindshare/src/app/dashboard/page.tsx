"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/layout/Navbar";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { RefreshCw, PenTool, Heart, Users, BookOpen, Sparkles, Lightbulb } from "lucide-react";

export default function DashboardPage() {
	const { data: session } = useSession();
	const [latestJournal, setLatestJournal] = useState<string>("");
	const [moodSummary, setMoodSummary] = useState<string>("");
	const [user, setUser] = useState<{displayName: string; avatarUrl?: string; userId?: string} | null>(null);
	const [wellnessTip, setWellnessTip] = useState<{
		tip: string;
		action: string;
		mood_insight: string;
	} | null>(null);
	const [motivationalQuote, setMotivationalQuote] = useState<{
		quote: string;
		author: string;
		context: string;
	} | null>(null);
	const [loadingAI, setLoadingAI] = useState(false);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

	useEffect(() => {
		(async () => {
			if (session?.user?.email) {
				try {
					console.log("Creating/getting user for email:", session.user.email);
					// Get or create user to get userId
					const userResponse = await apiPost<{ data: { displayName: string; avatarUrl: string; userId: string; originalName?: string; anonymousName?: string } }>("/api/users", { 
						email: session.user.email, 
						displayName: session.user.name,
						avatarUrl: session.user.image 
					});
					console.log("User response data:", userResponse.data);
					const userData = {
						displayName: userResponse.data.displayName,
						avatarUrl: userResponse.data.avatarUrl,
						userId: userResponse.data.userId,
						originalName: userResponse.data.originalName || userResponse.data.displayName,
						anonymousName: userResponse.data.anonymousName || `Anonymous_${Math.random().toString(36).substr(2, 9)}`
					};
					console.log("Setting user data:", userData);
					setUser(userData);
				} catch (e) {
					console.error("Failed to get user:", e);
				}
			}

			try {
				const j = await apiGet<{ snippet: string }>("/api/journals/latest");
				setLatestJournal(j.snippet);
			} catch {}
			try {
				const m = await apiGet<{ summary: string }>("/api/moods/latest");
				setMoodSummary(m.summary);
			} catch {}
			
		})();
	}, [session]);

	const handleUsernameChange = (newUsername: string) => {
		setUser(prev => prev ? { ...prev, displayName: newUsername } : null);
	};

	const fetchAIWellnessTips = useCallback(async () => {
		if (!user?.userId) {
			console.log("No userId available for AI wellness tips");
			return;
		}
		
		console.log("Fetching AI wellness tips for userId:", user.userId);
		setLoadingAI(true);
		try {
			// Get all mood data for AI context (from both manual tracking and journals)
			const moodResponse = await apiGet<{ data: Array<{ mood: string; date: string; note?: string; source?: string }> }>(`/api/moods/all/${user.userId}`);
			const allMoods = moodResponse.data || [];
			const recentMoods = allMoods.slice(0, 10); // Last 10 moods
			
			// Fetch wellness tip
			const wellnessResponse = await apiPost<{ data?: { tip: string; action: string; mood_insight: string } }>("/api/gemini/wellness-tip", {
				moodData: recentMoods,
				recentMoods: recentMoods.map(m => m.mood)
			});
			console.log("Wellness tip response:", wellnessResponse);
			// Extract data from response structure
			const wellnessData = wellnessResponse?.data || wellnessResponse;
			// Ensure we're setting the data correctly
			if (wellnessData && typeof wellnessData === 'object' && 'tip' in wellnessData) {
				console.log("Setting wellness tip:", wellnessData);
				// Force state update
				setWellnessTip(null);
				setTimeout(() => {
					setWellnessTip(wellnessData);
				}, 10);
			} else {
				console.error("Invalid wellness response structure:", wellnessData);
				// Set fallback content immediately
				setWellnessTip({
					tip: "Take a moment to breathe deeply and appreciate the present moment.",
					action: "Practice 5 minutes of mindful breathing",
					mood_insight: "Focus on your inner peace and strength"
				});
			}
			
			// Fetch motivational quote
			const quoteResponse = await apiPost<{ data?: { quote: string; author: string; context: string } }>("/api/gemini/motivational-quote", {
				moodData: recentMoods,
				recentMoods: recentMoods.map(m => m.mood)
			});
			console.log("Motivational quote response:", quoteResponse);
			// Extract data from response structure
			const quoteData = quoteResponse?.data || quoteResponse;
			// Ensure we're setting the data correctly
			if (quoteData && typeof quoteData === 'object' && 'quote' in quoteData) {
				console.log("Setting motivational quote:", quoteData);
				// Force state update
				setMotivationalQuote(null);
				setTimeout(() => {
					setMotivationalQuote(quoteData);
				}, 10);
			} else {
				console.error("Invalid quote response structure:", quoteData);
				// Set fallback content immediately
				setMotivationalQuote({
					quote: "Every day is a new beginning. Take a deep breath and start again.",
					author: "AI Wisdom",
					context: "A gentle reminder of your resilience and potential"
				});
			}
			setLastUpdated(new Date());
		} catch (e) {
			console.error("Failed to fetch AI content:", e);
			// Set fallback content
			setWellnessTip({
				tip: "Take a moment to breathe deeply and appreciate the present moment.",
				action: "Practice 5 minutes of mindful breathing",
				mood_insight: "Focus on your inner peace and strength"
			});
			setMotivationalQuote({
				quote: "Every day is a new beginning. Take a deep breath and start again.",
				author: "AI Wisdom",
				context: "A gentle reminder of your resilience and potential"
			});
			setLastUpdated(new Date());
		} finally {
			setLoadingAI(false);
		}
	}, [user?.userId]);

	// Debug user state changes
	useEffect(() => {
		console.log("User state changed:", user);
	}, [user]);

	// Debug AI content state changes
	useEffect(() => {
		console.log("Wellness tip state:", wellnessTip);
		console.log("Motivational quote state:", motivationalQuote);
	}, [wellnessTip, motivationalQuote]);

	useEffect(() => {
		console.log("Motivational quote state:", motivationalQuote);
	}, [motivationalQuote]);

	// Auto-fetch AI content when user is available
	useEffect(() => {
		if (user?.userId && !wellnessTip && !motivationalQuote && !loadingAI) {
			console.log("Auto-fetching AI content for user:", user.userId);
			fetchAIWellnessTips();
		}
	}, [user?.userId, wellnessTip, motivationalQuote, loadingAI, fetchAIWellnessTips]);

	// Fetch AI wellness tips when user is available
	useEffect(() => {
		if (user?.userId) {
			console.log("User has userId, fetching AI wellness tips");
			fetchAIWellnessTips();
		} else {
			console.log("User does not have userId yet, setting fallback content");
			// Set fallback content for new users
			setWellnessTip({
				tip: "Welcome to MindShare! Start your wellness journey by tracking your mood and writing in your journal.",
				action: "Try writing your first journal entry or tracking your mood",
				mood_insight: "Your wellness journey begins with awareness"
			});
			setMotivationalQuote({
				quote: "The journey of a thousand miles begins with a single step.",
				author: "Lao Tzu",
				context: "Perfect for starting your wellness journey"
			});
			setLastUpdated(new Date());
		}
	}, [user?.userId, fetchAIWellnessTips]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
			<Navbar 
				user={user || (session?.user ? {
					displayName: session.user.name || "User",
					avatarUrl: session.user.image || undefined
				} : null)} 
				onUsernameChange={handleUsernameChange}
			/>

			<main className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 dashboard-main">
				<div className="w-full">
					{/* Welcome Section */}
					<div className="text-center mb-16">
						<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800 mb-6">
							Welcome back, {user?.displayName || "User"}! 👋
						</h1>
						<p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
							Continue your wellness journey with mindful journaling and mood tracking
						</p>
					</div>

					{/* Navigation Cards Grid */}
					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 mb-24 navigation-cards">
						<Link href="/journal" className="group">
							<Card className="h-full p-8 lg:p-10 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-purple-100 to-pink-100 border-purple-200 hover:border-purple-300">
								<div className="text-center">
									<div className="w-20 h-20 mx-auto mb-6 bg-purple-200 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
										<PenTool className="w-10 h-10 text-purple-600" />
									</div>
									<h3 className="text-2xl font-bold text-slate-800 mb-4">Write Journal</h3>
									<p className="text-slate-600 text-base leading-relaxed">
										{latestJournal ? `"${latestJournal.substring(0, 80)}${latestJournal.length > 80 ? '...' : ''}"` : "Capture your thoughts and feelings in a safe space."}
									</p>
								</div>
							</Card>
						</Link>

						<Link href="/mood" className="group">
							<Card className="h-full p-8 lg:p-10 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-200 hover:border-blue-300">
								<div className="text-center">
									<div className="w-20 h-20 mx-auto mb-6 bg-blue-200 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
										<Heart className="w-10 h-10 text-blue-600" />
									</div>
									<h3 className="text-2xl font-bold text-slate-800 mb-4">Track Mood</h3>
									<p className="text-slate-600 text-base leading-relaxed">
										{moodSummary || "Log how you feel today and track your emotional patterns."}
									</p>
								</div>
							</Card>
						</Link>

						<Link href="/feed" className="group">
							<Card className="h-full p-8 lg:p-10 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-rose-100 to-pink-100 border-rose-200 hover:border-rose-300">
								<div className="text-center">
									<div className="w-20 h-20 mx-auto mb-6 bg-rose-200 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
										<Users className="w-10 h-10 text-rose-600" />
									</div>
									<h3 className="text-2xl font-bold text-slate-800 mb-4">Community Feed</h3>
									<p className="text-slate-600 text-base leading-relaxed">
										See anonymized posts from the community and find inspiration.
									</p>
								</div>
							</Card>
						</Link>

						<Link href="/history" className="group">
							<Card className="h-full p-8 lg:p-10 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-emerald-100 to-green-100 border-emerald-200 hover:border-emerald-300">
								<div className="text-center">
									<div className="w-20 h-20 mx-auto mb-6 bg-emerald-200 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
										<BookOpen className="w-10 h-10 text-emerald-600" />
									</div>
									<h3 className="text-2xl font-bold text-slate-800 mb-4">Journal History</h3>
									<p className="text-slate-600 text-base leading-relaxed">
										View all your past journal entries and reflect on your journey.
									</p>
								</div>
							</Card>
						</Link>
					</div>


					{/* AI Content Section with better spacing */}
					<div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mt-8 ai-content-section">
						{/* AI Wellness Tip */}
						<Card className="p-8 lg:p-10 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-xl">
							<div className="flex items-start gap-6">
								<div className="w-16 h-16 bg-green-200 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg">
									<Lightbulb className="w-8 h-8 text-green-600" />
								</div>
								<div className="flex-1">
									<div className="flex items-center justify-between mb-6">
										<div className="flex items-center gap-4">
											<h3 className="text-2xl font-bold text-slate-800">Today&apos;s Wellness Tip</h3>
											<span className="text-sm bg-green-200 text-green-700 px-4 py-2 rounded-full font-semibold">AI Generated</span>
										</div>
										<button
											onClick={fetchAIWellnessTips}
											disabled={loadingAI}
											className="p-3 rounded-2xl bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
											title="Get new AI wellness tip"
										>
											<RefreshCw size={20} className={loadingAI ? "animate-spin" : ""} />
										</button>
									</div>
									{wellnessTip ? (
										<div className="space-y-6">
											<p className="text-slate-700 text-lg leading-relaxed font-medium">
												{wellnessTip.tip || "No tip available"}
											</p>
											<div className="bg-white/80 rounded-3xl p-6 border border-green-200 shadow-md">
												<div className="flex items-start gap-4">
													<Sparkles className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
													<div>
														<p className="text-base font-bold text-green-800 mb-3">Action for today:</p>
														<p className="text-base text-green-700 leading-relaxed">
															{wellnessTip.action || "No action available"}
														</p>
													</div>
												</div>
											</div>
											{wellnessTip.mood_insight && (
												<p className="text-base text-slate-600 italic leading-relaxed font-medium">
													&ldquo;{wellnessTip.mood_insight}&rdquo;
												</p>
											)}
											{lastUpdated && (
												<p className="text-sm text-slate-500 mt-4 font-medium">
													Last updated: {lastUpdated.toLocaleTimeString()}
												</p>
											)}
										</div>
									) : (
										<div className="flex items-center gap-4 text-slate-600">
											<div className="w-6 h-6 border-3 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
											<p className="text-base font-medium">
												{loadingAI ? "Generating personalized wellness tip..." : "Loading personalized wellness tip..."}
											</p>
										</div>
									)}
								</div>
							</div>
						</Card>

						{/* AI Motivational Quote */}
						<Card className="p-8 lg:p-10 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-xl">
							<div className="flex items-start gap-6">
								<div className="w-16 h-16 bg-purple-200 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg">
									<Sparkles className="w-8 h-8 text-purple-600" />
								</div>
								<div className="flex-1">
									<div className="flex items-center justify-between mb-6">
										<div className="flex items-center gap-4">
											<h3 className="text-2xl font-bold text-slate-800">Daily Inspiration</h3>
											<span className="text-sm bg-purple-200 text-purple-700 px-4 py-2 rounded-full font-semibold">AI Generated</span>
										</div>
										<button
											onClick={fetchAIWellnessTips}
											disabled={loadingAI}
											className="p-3 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-600 hover:text-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
											title="Get new motivational quote"
										>
											<RefreshCw size={20} className={loadingAI ? "animate-spin" : ""} />
										</button>
									</div>
									{motivationalQuote ? (
										<div className="space-y-6">
											<blockquote className="text-slate-700 text-xl italic leading-relaxed font-medium">
												&ldquo;{motivationalQuote.quote || "No quote available"}&rdquo;
											</blockquote>
											<div className="text-right">
												<p className="text-base font-semibold text-slate-600">
													— {motivationalQuote.author || "Unknown"}
												</p>
												<p className="text-sm text-slate-500 mt-2 font-medium">
													{motivationalQuote.context || "No context available"}
												</p>
											</div>
										</div>
									) : (
										<div className="flex items-center gap-4 text-slate-600">
											<div className="w-6 h-6 border-3 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
											<p className="text-base font-medium">
												{loadingAI ? "Generating daily inspiration..." : "Loading daily inspiration..."}
											</p>
										</div>
									)}
								</div>
							</div>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
