"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import ImageModal from "@/components/ui/ImageModal";
import { apiGet, apiPost } from "@/lib/api";
import { Image, Volume2, Play, Pause, RefreshCw } from "lucide-react";

type Journal = {
	journalId: string;
	content: string;
	mood?: string;
	privacy: string;
	createdAt: string;
	attachments?: {
		images?: Array<{
			name: string;
			size: number;
			type: string;
			url: string;
		}>;
		audio?: {
			size: number;
			type: string;
			url: string;
		};
	};
};

export default function HistoryPage() {
	const { data: session } = useSession();
	const [journals, setJournals] = useState<Journal[]>([]);
	const [loading, setLoading] = useState(true);
	const [userId, setUserId] = useState<string | null>(null);
	const [playingAudio, setPlayingAudio] = useState<string | null>(null);
	const [selectedImage, setSelectedImage] = useState<{url: string, name: string, size: number} | null>(null);

	const loadJournals = useCallback(async () => {
		if (!session?.user?.email) return;
		
		setLoading(true);
		try {
			// Get or create user first
			const userResponse = await apiPost<{ data: { userId: string } }>("/api/users", { 
				email: session.user.email, 
				displayName: session.user.name,
				avatarUrl: session.user.image 
			});
			setUserId(userResponse.data.userId);
			
			// Get user's journals by email (this will get all journals for this email)
			const journalsResponse = await apiGet<{ data: Journal[] }>(`/api/journals/by-email?email=${encodeURIComponent(session.user.email)}`);
			setJournals(journalsResponse.data);
		} catch (e) {
			console.error("Failed to load journals:", e);
		} finally {
			setLoading(false);
		}
	}, [session]);

	// Load data automatically when component mounts and when session changes
	useEffect(() => {
		loadJournals();
	}, [loadJournals]);

	// Refresh history when page becomes visible (e.g., after username change in another tab)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (!document.hidden && session?.user?.email) {
				loadJournals();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	}, [loadJournals, session]);

	const getMoodEmoji = (mood?: string) => {
		const moodMap: Record<string, string> = {
			happy: "😊",
			sad: "😔", 
			anxious: "😟",
			calm: "😌",
			neutral: "😐"
		};
		return moodMap[mood || ""] || "";
	};

	const getRelativeTime = (dateString: string) => {
		const now = new Date();
		const postDate = new Date(dateString);
		const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
		
		if (diffInSeconds < 60) return "Just now";
		if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
		if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
		if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
		return postDate.toLocaleDateString();
	};

	const playAudio = (audioData: any) => {
		if (playingAudio === audioData.journalId) {
			// Stop current audio
			setPlayingAudio(null);
			return;
		}
		
		// Play the actual audio file
		if (audioData.url) {
			const audio = new Audio(audioData.url);
			audio.play();
			setPlayingAudio(audioData.journalId);
			
			audio.onended = () => {
				setPlayingAudio(null);
			};
		}
	};

	const renderAttachments = (journal: Journal) => {
		if (!journal.attachments) return null;

		const { images, audio } = journal.attachments;

		return (
			<div className="mt-6 space-y-4">
				{images && images.length > 0 && (
					<div className="space-y-3">
						<h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
							<Image size={16} />
							Images ({images.length})
						</h4>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
							{images.map((img: any, index: number) => (
								<div key={index} className="relative group cursor-pointer" onClick={() => setSelectedImage({url: img.url, name: img.name, size: img.size})}>
									<img 
										src={img.url} 
										alt={img.name}
										className="w-full h-40 object-cover rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-200"
										onError={(e) => {
											e.currentTarget.style.display = 'none';
										}}
										loading="lazy"
									/>
									<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-xl flex items-center justify-center">
										<div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg p-3 shadow-lg">
											<Image size={20} className="text-slate-600" />
										</div>
									</div>
									<div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-60 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
										<div className="font-medium">{img.name}</div>
										<div>{(img.size / 1024).toFixed(1)} KB</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
				{audio && (
					<div className="space-y-2">
						<h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
							<Volume2 size={16} />
							Voice Note
						</h4>
						<div className="flex items-center gap-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border-2 border-slate-200">
							<div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
								<Volume2 size={20} className="text-white" />
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium text-slate-700">Voice Note</div>
								<div className="text-xs text-slate-500">{(audio.size / 1024).toFixed(1)} KB</div>
							</div>
							<button
								onClick={() => playAudio({ journalId: journal.journalId, url: audio.url })}
								className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
							>
								{playingAudio === journal.journalId ? <Pause size={16} /> : <Play size={16} />}
								<span className="text-sm font-medium">
									{playingAudio === journal.journalId ? "Pause" : "Play"}
								</span>
							</button>
						</div>
					</div>
				)}
			</div>
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden flex items-center justify-center">
				{/* Cool Background Elements */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-xl animate-pulse"></div>
					<div className="absolute top-40 right-20 w-24 h-24 bg-purple-200/30 rounded-full blur-xl animate-pulse delay-1000"></div>
					<div className="absolute bottom-40 left-1/4 w-40 h-40 bg-indigo-200/30 rounded-full blur-xl animate-pulse delay-2000"></div>
				</div>
				
				<div className="relative z-10 text-center">
					<div className="inline-flex items-center gap-3 px-6 py-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-200 shadow-lg">
						<div className="w-6 h-6 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
						<span className="text-lg font-medium text-slate-700">Loading your journal history...</span>
					</div>
				</div>
			</div>
		);
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
						<h1 className="text-5xl font-bold text-slate-800 mb-4">Your Journal History</h1>
						<p className="text-xl text-slate-600 mb-6">View all your past journal entries and reflect on your journey</p>
						
						{/* Header Actions */}
						<div className="flex items-center justify-center gap-4">
							<button
								onClick={loadJournals}
								disabled={loading}
								className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
								title="Refresh history"
							>
								<RefreshCw size={20} className={loading ? "animate-spin" : ""} />
								<span className="font-medium">Refresh History</span>
							</button>
						</div>
					</div>
			
					{/* Scrollable Journals Container */}
					<div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
						{journals.length === 0 ? (
							<Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-2 border-slate-200 shadow-xl">
								<div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
									<RefreshCw size={40} className="text-blue-600" />
								</div>
								<h3 className="text-2xl font-bold text-slate-800 mb-2">No journals available</h3>
								<p className="text-lg text-slate-600 mb-6">You haven&apos;t written any journal entries yet. Start your journey by writing your first entry!</p>
								<div className="flex gap-4 justify-center">
									<button 
										onClick={loadJournals}
										className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
									>
										Refresh History
									</button>
									<button 
										onClick={() => window.location.href = '/journal'}
										className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
									>
										Write Your First Entry
									</button>
								</div>
							</Card>
						) : (
							<div className="space-y-12">
								{journals.map((journal, index) => (
									<Card key={journal.journalId} className={`p-6 backdrop-blur-sm border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 relative my-4 ${index % 2 === 0 ? 'bg-white/80' : 'bg-slate-50/80'}`}>
										{/* Post Separator - only show for posts after the first one */}
										{index > 0 && (
											<div className="absolute -top-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
												<div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
												<div className="w-2 h-2 bg-slate-300 rounded-full mt-2"></div>
											</div>
										)}
										{/* Journal Header */}
										<div className="flex items-start justify-between mb-4">
											<div className="flex items-center gap-4">
												<div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center shadow-md">
													<span className="text-3xl">{getMoodEmoji(journal.mood)}</span>
												</div>
												<div>
													<div className="text-lg font-semibold text-slate-700 mb-1">{getRelativeTime(journal.createdAt)}</div>
													<div className="text-sm text-slate-500">
														{new Date(journal.createdAt).toLocaleDateString()} at{" "}
														{new Date(journal.createdAt).toLocaleTimeString()}
													</div>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<span className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 ${
													journal.privacy === "private" 
														? "bg-purple-100 text-purple-700 border-purple-200" 
														: "bg-sky-100 text-sky-700 border-sky-200"
												}`}>
													{journal.privacy === "private" ? "🔒 Private" : "🌐 Anonymous"}
												</span>
											</div>
										</div>
										
										{/* Journal Content */}
										<div className="mb-4">
											<p className="text-lg leading-relaxed text-slate-800 whitespace-pre-wrap">{journal.content}</p>
										</div>
										
										{/* Attachments */}
										{renderAttachments(journal)}
									</Card>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
			
			{/* Image Modal */}
			{selectedImage && (
				<ImageModal
					isOpen={!!selectedImage}
					onClose={() => setSelectedImage(null)}
					imageUrl={selectedImage.url}
					imageName={selectedImage.name}
					imageSize={selectedImage.size}
				/>
			)}
		</div>
	);
}
