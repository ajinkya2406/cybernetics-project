"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiGet, apiPost } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useSession } from "next-auth/react";

const MOODS = [
	{ key: "happy", label: "Happy", emoji: "😊" },
	{ key: "sad", label: "Sad", emoji: "😔" },
	{ key: "anxious", label: "Anxious", emoji: "😟" },
	{ key: "calm", label: "Calm", emoji: "😌" },
	{ key: "neutral", label: "Neutral", emoji: "😐" },
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
	if (active && payload && payload.length) {
		const data = payload[0].payload;
		// Only log tooltip data in development mode to reduce console spam
		if (process.env.NODE_ENV === 'development' && data.id && (!(window as any).lastTooltipId || (window as any).lastTooltipId !== data.id)) {
			console.log("Tooltip data:", data);
			(window as any).lastTooltipId = data.id;
		}
		return (
			<div className="bg-white/90 backdrop-blur-sm p-4 border-2 border-slate-200 rounded-xl shadow-xl max-w-xs">
				<div className="flex items-center gap-2 mb-2">
					<span className="text-2xl">{data.mood === 'happy' ? '😊' : data.mood === 'sad' ? '😔' : data.mood === 'anxious' ? '😟' : data.mood === 'calm' ? '😌' : '😐'}</span>
					<p className="font-bold text-lg text-slate-800">{data.moodLabel}</p>
				</div>
				<p className="text-sm text-slate-600 mb-1">📅 {data.date}</p>
				<p className="text-sm text-slate-600 mb-1">🕐 {data.time}</p>
				{data.source && (
					<p className="text-xs text-slate-500 mb-2">
						{data.source === 'journal' ? '📝 From Journal Entry' : '✋ Manual Entry'}
					</p>
				)}
				{data.note && (
					<div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
						<p className="text-sm text-slate-700 italic">"{data.note}"</p>
					</div>
				)}
				{data.id && (
					<p className="text-xs text-slate-400 mt-2">ID: {data.id}</p>
				)}
			</div>
		);
	}
	return null;
};

export default function MoodPage() {
	const { data: session } = useSession();
	const [selected, setSelected] = useState<string>("neutral");
	const [note, setNote] = useState("");
	const [trend, setTrend] = useState<Array<{ 
		date: string; 
		time: string;
		score: number; 
		mood: string;
		moodLabel: string;
		note: string;
	}>>([]);
	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			if (!session?.user?.email) return;
			
			try {
				// Get or create user first
				const userResponse = await apiPost("/api/users", { 
					email: session.user.email, 
					displayName: session.user.name,
					avatarUrl: session.user.image 
				});
				setUserId(userResponse.data.userId);
				
				// Get all mood trends for this user (from both manual tracking and journals)
				console.log("Fetching all mood trends for userId:", userResponse.data.userId);
				const res = await apiGet<{ data: Array<{ date: string; mood: string; note?: string; source?: string }> }>(`/api/moods/all/${userResponse.data.userId}`);
				console.log("Initial mood trends response:", res);
				console.log("Raw data length:", res.data.length);
				console.log("Raw data sample:", res.data.slice(0, 3));
				
				// Validate that we have real data, not sample data
				if (!res.data || res.data.length === 0) {
					console.log("No mood data found - user needs to create journal entries or track moods manually");
					setTrend([]);
					return;
				}
				
				// Convert mood data to chart format
				const moodScores = { happy: 5, sad: 1, anxious: 2, calm: 4, neutral: 3 };
				const moodLabels = { happy: "Happy", sad: "Sad", anxious: "Anxious", calm: "Calm", neutral: "Neutral" };
				
				// Filter out invalid mood data and deduplicate
				const validMoods = res.data.filter(item => {
					// Only include items with valid mood and date
					return item.mood && item.date && 
						   ['happy', 'sad', 'anxious', 'calm', 'neutral'].includes(item.mood);
				});
				
				console.log("Valid moods after filtering:", validMoods.length);
				console.log("Valid moods by source:", {
					manual: validMoods.filter(m => m.source === 'manual').length,
					journal: validMoods.filter(m => m.source === 'journal').length
				});
				
				// Deduplicate by moodId to prevent duplicates
				const uniqueMoods = validMoods.reduce((acc, item) => {
					const key = item.moodId || `mood_${item.date}_${item.mood}`;
					if (!acc[key]) {
						acc[key] = item;
					} else {
						console.log("Duplicate found:", key, item);
					}
					return acc;
				}, {} as Record<string, any>);
				
				console.log("Unique moods after deduplication:", Object.keys(uniqueMoods).length);
				
				const chartData = Object.values(uniqueMoods)
					.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort by date
					.map((item, index) => {
						const uniqueId = item.moodId || `mood_${item.date}_${item.mood}_${index}`;
						return {
							id: uniqueId, // Ensure unique ID
							key: uniqueId, // Add key for React rendering
							date: new Date(item.date).toLocaleDateString(),
							time: new Date(item.date).toLocaleTimeString(),
							score: moodScores[item.mood as keyof typeof moodScores] || 3,
							mood: item.mood,
							moodLabel: moodLabels[item.mood as keyof typeof moodLabels] || "Unknown",
							note: item.note || "",
							source: item.source || "manual",
							originalDate: item.date, // Keep original date for reference
							index: index // Add index for debugging
						};
					});
				console.log("Chart data processed successfully:", chartData.length, "mood entries");
				if (chartData.length > 0) {
					console.log("First mood entry:", chartData[0]);
					console.log("Last mood entry:", chartData[chartData.length - 1]);
					console.log("All mood entries:", chartData.map(item => ({
						id: item.id,
						mood: item.mood,
						date: item.date,
						time: item.time,
						score: item.score
					})));
				}
				setTrend(chartData);
			} catch (e) {
				console.error("Failed to load mood trends:", e);
			}
		})();
	}, [session]);

	async function submitMood() {
		if (!userId) {
			console.error("No userId available for mood submission");
			return;
		}
		
		console.log("Submitting mood:", { userId, mood: selected, note });
		
		try {
			const response = await apiPost("/api/moods", { 
				userId, 
				mood: selected, 
				note 
			});
			console.log("Mood submission response:", response);
			setNote("");
			
			// Refresh the trend data
			console.log("Fetching updated mood trends for userId:", userId);
			const res = await apiGet<{ data: Array<{ date: string; mood: string; note?: string; source?: string }> }>(`/api/moods/all/${userId}`);
			console.log("Mood trends response:", res);
			
			const moodScores = { happy: 5, sad: 1, anxious: 2, calm: 4, neutral: 3 };
			const moodLabels = { happy: "Happy", sad: "Sad", anxious: "Anxious", calm: "Calm", neutral: "Neutral" };
			
			// Filter out invalid mood data and deduplicate
			const validMoods = res.data.filter(item => {
				// Only include items with valid mood and date
				return item.mood && item.date && 
					   ['happy', 'sad', 'anxious', 'calm', 'neutral'].includes(item.mood);
			});
			
			console.log("Valid moods after filtering:", validMoods.length);
			console.log("Valid moods by source:", {
				manual: validMoods.filter(m => m.source === 'manual').length,
				journal: validMoods.filter(m => m.source === 'journal').length
			});
			
			// Deduplicate by moodId to prevent duplicates
			const uniqueMoods = validMoods.reduce((acc, item) => {
				const key = item.moodId || `mood_${item.date}_${item.mood}`;
				if (!acc[key]) {
					acc[key] = item;
				} else {
					console.log("Duplicate found:", key, item);
				}
				return acc;
			}, {} as Record<string, any>);
			
			const chartData = Object.values(uniqueMoods)
				.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort by date
				.map((item, index) => {
					const uniqueId = item.moodId || `mood_${item.date}_${item.mood}_${index}`;
					return {
						id: uniqueId, // Ensure unique ID
						key: uniqueId, // Add key for React rendering
						date: new Date(item.date).toLocaleDateString(),
						time: new Date(item.date).toLocaleTimeString(),
						score: moodScores[item.mood as keyof typeof moodScores] || 3,
						mood: item.mood,
						moodLabel: moodLabels[item.mood as keyof typeof moodLabels] || "Unknown",
						note: item.note || "",
						source: item.source || "manual",
						originalDate: item.date, // Keep original date for reference
						index: index // Add index for debugging
					};
				});
			console.log("Chart data updated successfully:", chartData.length, "mood entries");
			if (chartData.length > 0) {
				console.log("First mood entry:", chartData[0]);
				console.log("Last mood entry:", chartData[chartData.length - 1]);
			}
			setTrend(chartData);
		} catch (e) {
			console.error("Failed to save mood:", e);
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
			{/* Cool Background Elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				{/* Floating Circles */}
				<div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-xl animate-pulse"></div>
				<div className="absolute top-40 right-20 w-24 h-24 bg-purple-200/30 rounded-full blur-xl animate-pulse delay-1000"></div>
				<div className="absolute bottom-40 left-1/4 w-40 h-40 bg-indigo-200/30 rounded-full blur-xl animate-pulse delay-2000"></div>
				<div className="absolute bottom-20 right-1/3 w-28 h-28 bg-pink-200/30 rounded-full blur-xl animate-pulse delay-3000"></div>
				
				{/* Geometric Shapes */}
				<div className="absolute top-32 right-1/4 w-16 h-16 bg-gradient-to-br from-blue-300/20 to-purple-300/20 rotate-45 rounded-lg animate-bounce delay-500"></div>
				<div className="absolute bottom-32 left-1/3 w-12 h-12 bg-gradient-to-br from-indigo-300/20 to-pink-300/20 rotate-12 rounded-lg animate-bounce delay-1500"></div>
				<div className="absolute top-1/2 right-10 w-20 h-20 bg-gradient-to-br from-purple-300/20 to-blue-300/20 rotate-45 rounded-full animate-pulse delay-2500"></div>
			</div>

			{/* Main Content */}
			<div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
				<div className="w-full max-w-5xl">
					{/* Header */}
					<div className="text-center mb-8">
						<h1 className="text-5xl font-bold text-slate-800 mb-4">Mood Tracking</h1>
						<p className="text-xl text-slate-600 mb-6">Track your emotional journey and discover patterns in your wellbeing</p>
					</div>

					{/* Scrollable Content Container */}
					<div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent space-y-8">
						{/* Info Card */}
						<Card className="p-8 bg-white/80 backdrop-blur-sm border-2 border-blue-200 shadow-xl">
							<div className="flex items-center gap-4 mb-4">
								<div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
									<span className="text-3xl">💡</span>
								</div>
								<div>
									<h3 className="text-2xl font-bold text-blue-800">Automatic Mood Tracking</h3>
									<p className="text-lg text-blue-700 mt-2">
										Your moods are automatically tracked when you select a mood while writing journal entries. 
										You can also manually track moods below.
									</p>
								</div>
							</div>
						</Card>

						{/* Mood Trends Chart */}
						<Card className="p-8 bg-white/80 backdrop-blur-sm border-2 border-slate-200 shadow-xl">
							<div className="text-center mb-6">
								<h2 className="text-3xl font-bold text-slate-800 mb-2">Your Mood Trends</h2>
								<p className="text-lg text-slate-600">Visualize your emotional patterns over time</p>
							</div>
							{trend.length === 0 ? (
								<div className="h-80 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border-2 border-slate-100 flex items-center justify-center">
									<div className="text-center">
										<div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
											<span className="text-4xl">📊</span>
										</div>
										<h3 className="text-xl font-bold text-slate-800 mb-2">No Mood Data Yet</h3>
										<p className="text-slate-600 mb-4">Start tracking your moods to see your emotional journey!</p>
										<div className="text-sm text-slate-500">
											<p>• Write journal entries and select a mood</p>
											<p>• Or manually track moods using the form below</p>
										</div>
									</div>
								</div>
							) : (
								<div className="h-80 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border-2 border-slate-100">
									<ResponsiveContainer width="100%" height="100%">
										<LineChart 
											data={trend} 
											margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
											key={`chart-${trend.length}-${trend[0]?.id || 'empty'}`}
										>
											<XAxis dataKey="date" hide />
											<YAxis hide domain={[0, 5]} />
											<Tooltip content={<CustomTooltip />} />
											<Line 
												type="monotone" 
												dataKey="score" 
												stroke="#0ea5e9" 
												strokeWidth={4} 
												dot={{ fill: '#0ea5e9', strokeWidth: 3, r: 6 }}
												activeDot={{ r: 8, stroke: '#0ea5e9', strokeWidth: 3 }}
												key={`line-${trend.length}`}
											/>
										</LineChart>
									</ResponsiveContainer>
								</div>
							)}
						</Card>

						{/* Mood Selection */}
						<Card className="p-8 bg-white/80 backdrop-blur-sm border-2 border-slate-200 shadow-xl">
							<div className="text-center mb-8">
								<h2 className="text-3xl font-bold text-slate-800 mb-2">How are you feeling?</h2>
								<p className="text-lg text-slate-600">Select your current mood and add a note</p>
							</div>
							
							{/* Mood Buttons */}
							<div className="flex flex-wrap justify-center gap-4 mb-8">
								{MOODS.map((m) => (
									<button
										key={m.key}
										onClick={() => setSelected(m.key)}
										className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-200 text-lg font-semibold min-w-[140px] ${
											selected === m.key 
												? "bg-gradient-to-r from-blue-500 to-purple-600 text-white border-blue-500 shadow-lg transform scale-105" 
												: "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
										}`}
									>
										<span className="text-2xl">{m.emoji}</span>
										<span>{m.label}</span>
									</button>
								))}
							</div>

							{/* Note Input and Save */}
							<div className="flex items-center gap-4">
								<input 
									value={note} 
									onChange={(e) => setNote(e.target.value)} 
									placeholder="Add a note about your mood..." 
									className="flex-1 h-14 px-6 rounded-2xl border-2 border-slate-200 bg-white/80 text-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none" 
								/>
								<Button 
									onClick={submitMood}
									className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 min-w-[120px]"
								>
									Save Mood
								</Button>
							</div>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
