"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ImageModal from "@/components/ui/ImageModal";
import { apiGet, apiPost } from "@/lib/api";
import { Image, Volume2, Play, Pause, Heart, MessageCircle, ThumbsUp, Users, Eye, RefreshCw } from "lucide-react";

type Journal = {
	journalId: string;
	content: string;
	mood?: string;
	privacy: string;
	displayName?: string;
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

type Interaction = {
	interactionId: string;
	journalId: string;
	userId: string;
	type: 'like' | 'comment';
	content?: string;
	createdAt: string;
};

type InteractionsData = {
	[journalId: string]: {
		likes: Interaction[];
		comments: Interaction[];
	};
};

export default function FeedPage() {
	const { data: session } = useSession();
	const [items, setItems] = useState<Journal[]>([]);
	const [loading, setLoading] = useState(false);
	const [playingAudio, setPlayingAudio] = useState<string | null>(null);
	const [selectedImage, setSelectedImage] = useState<{url: string, name: string, size: number} | null>(null);
	const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
	const [showComments, setShowComments] = useState<Set<string>>(new Set());
	const [commentText, setCommentText] = useState<{[key: string]: string}>({});
	const [interactions, setInteractions] = useState<InteractionsData>({});
	const [isAnonymous, setIsAnonymous] = useState(false);
	const [loadingInteractions, setLoadingInteractions] = useState(false);

	async function load() {
		setLoading(true);
		try {
			// Check if user is in anonymous mode (only when not logged in with Google)
			const anonymousUser = localStorage.getItem('anonymousUser');
			const isLoggedIn = !!session?.user?.email;
			
			// User is anonymous only if they have anonymousUser in localStorage AND are not logged in with Google
			setIsAnonymous(!!anonymousUser && !isLoggedIn);

			const res = await apiGet<{ data: Journal[] }>("/api/journals");
			const journals = res.data ?? [];
			setItems(journals);

			// Load interactions for all journals
			if (journals.length > 0) {
				setLoadingInteractions(true);
				const journalIds = journals.map(j => j.journalId);
				try {
					const interactionsRes = await apiPost<{ data: InteractionsData }>("/api/interactions/journals", {
						journalIds
					});
					setInteractions(interactionsRes.data || {});
				} catch (e) {
					console.error("Failed to load interactions:", e);
					// Set empty interactions if CORS fails
					setInteractions({});
				} finally {
					setLoadingInteractions(false);
				}
			}
		} catch (e) {
			console.error("Failed to load feed:", e);
		} finally {
			setLoading(false);
		}
	}

	// Function to update interactions for a specific journal
	const updateInteractionsForJournal = async (journalId: string) => {
		try {
			const interactionsRes = await apiPost<{ data: InteractionsData }>("/api/interactions/journals", {
				journalIds: [journalId]
			});
			const newInteractions = interactionsRes.data || {};
			setInteractions(prev => ({
				...prev,
				...newInteractions
			}));
		} catch (e) {
			console.error("Failed to update interactions for journal:", e);
		}
	};

	// Only load data when refresh button is clicked, not automatically
	// useEffect(() => {
	// 	load();
	// }, [session]);

	// Refresh feed when page becomes visible (e.g., after username change in another tab)
	// useEffect(() => {
	// 	const handleVisibilityChange = () => {
	// 		if (!document.hidden) {
	// 			load();
	// 		}
	// 	};

	// 	document.addEventListener('visibilitychange', handleVisibilityChange);
	// 	return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	// }, []);

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
			<div className="mt-3 space-y-2">
				{images && images.length > 0 && (
					<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
						{images.map((img: any, index: number) => (
							<div key={index} className="relative group cursor-pointer" onClick={() => setSelectedImage({url: img.url, name: img.name, size: img.size})}>
								<img 
									src={img.url} 
									alt={img.name}
									className="w-full h-32 object-cover rounded-lg border border-slate-200 hover:shadow-lg transition-shadow"
									onError={(e) => {
										e.currentTarget.style.display = 'none';
									}}
									loading="lazy"
								/>
								<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
									<div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg p-2">
										<Image size={16} className="text-slate-600" />
									</div>
								</div>
								<div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
									{img.name} ({(img.size / 1024).toFixed(1)} KB)
								</div>
							</div>
						))}
					</div>
				)}
				{audio && (
					<div className="flex items-center gap-2 bg-slate-100 rounded-lg p-2">
						<Volume2 size={16} className="text-slate-600" />
						<span className="text-sm text-slate-600">Voice Note ({(audio.size / 1024).toFixed(1)} KB)</span>
						<button
							onClick={() => playAudio({ journalId: journal.journalId, url: audio.url })}
							className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
						>
							{playingAudio === journal.journalId ? <Pause size={14} /> : <Play size={14} />}
							{playingAudio === journal.journalId ? "Pause" : "Play"}
						</button>
					</div>
				)}
			</div>
		);
	};

	async function handleLike(journalId: string) {
		if (isAnonymous) {
			alert("Please sign in to like posts");
			return;
		}

		try {
			const isLiked = likedPosts.has(journalId);
			if (isLiked) {
				setLikedPosts(prev => {
					const newSet = new Set(prev);
					newSet.delete(journalId);
					return newSet;
				});
			} else {
				setLikedPosts(prev => new Set(prev).add(journalId));
			}
			await apiPost("/api/interactions", { 
				type: "like", 
				journalId, 
				userId: session?.user?.email || "anonymous",
				action: isLiked ? "remove" : "add"
			});
			
			// Update interactions for this specific journal only
			await updateInteractionsForJournal(journalId);
		} catch (e) {
			console.error("Failed to like:", e);
		}
	}

	async function handleComment(journalId: string) {
		if (isAnonymous) {
			alert("Please sign in to comment on posts");
			return;
		}

		const comment = commentText[journalId]?.trim();
		if (!comment) return;

		try {
			await apiPost("/api/interactions", { 
				type: "comment", 
				journalId, 
				userId: session?.user?.email || "anonymous",
				content: comment
			});
			setCommentText(prev => ({ ...prev, [journalId]: "" }));
			
			// Update interactions for this specific journal only
			await updateInteractionsForJournal(journalId);
		} catch (e) {
			console.error("Failed to comment:", e);
		}
	}

	async function interact(type: "like" | "comment", id: string) {
		try {
			await apiPost("/api/interactions", { type, journalId: id, userId: "anonymous" });
		} catch (e) {
			console.error("Failed to interact:", e);
		}
	}

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
				<div className="w-full max-w-4xl">
					{/* Header */}
					<div className="text-center mb-8">
						<h1 className="text-5xl font-bold text-slate-800 mb-4">Community Feed</h1>
						<p className="text-xl text-slate-600 mb-6">See anonymized posts from the community and find inspiration</p>
						
						{/* Header Actions */}
						<div className="flex items-center justify-center gap-4">
							<button
								onClick={load}
								disabled={loading}
								className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
								title="Refresh feed"
							>
								<RefreshCw size={20} className={loading ? "animate-spin" : ""} />
								<span className="font-medium">Refresh Feed</span>
							</button>
							{isAnonymous && (
								<div className="flex items-center gap-2 px-4 py-3 bg-amber-100/80 backdrop-blur-sm text-amber-800 rounded-xl border-2 border-amber-200 shadow-lg">
									<Eye size={18} />
									<span className="font-medium">Anonymous Mode</span>
								</div>
							)}
						</div>
					</div>
			
					{/* Scrollable Feed Container */}
					<div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
						{loading ? (
							<div className="text-center py-16">
								<div className="inline-flex items-center gap-3 px-6 py-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-200 shadow-lg">
									<div className="w-6 h-6 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
									<span className="text-lg font-medium text-slate-700">Loading community posts...</span>
								</div>
							</div>
						) : loadingInteractions ? (
							<div className="text-center py-8">
								<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200">
									<div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
									<span className="text-sm text-slate-600">Loading interactions...</span>
								</div>
							</div>
						) : items.length === 0 ? (
							<Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-2 border-slate-200 shadow-xl">
								<div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
									<Users size={40} className="text-blue-600" />
								</div>
								<h3 className="text-2xl font-bold text-slate-800 mb-2">No posts loaded</h3>
								<p className="text-lg text-slate-600 mb-6">Click the refresh button above to load community posts, or be the first to share your thoughts!</p>
								<div className="flex gap-4 justify-center">
									<button 
										onClick={load}
										className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
									>
										Load Posts
									</button>
									<button 
										onClick={() => window.location.href = '/journal'}
										className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
									>
										Write Your First Post
									</button>
								</div>
							</Card>
						) : (
							<div className="space-y-12">
								{items.map((j, index) => (
									<Card key={j.journalId} className={`p-6 backdrop-blur-sm border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 relative my-4 ${index % 2 === 0 ? 'bg-white/80' : 'bg-slate-50/80'}`}>
										{/* Post Separator - only show for posts after the first one */}
										{index > 0 && (
											<div className="absolute -top-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
												<div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
												<div className="w-2 h-2 bg-slate-300 rounded-full mt-2"></div>
											</div>
										)}
										{/* Post Header */}
										<div className="flex items-center justify-between mb-4">
											<div className="flex items-center gap-3">
												<div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center shadow-md">
													<span className="text-2xl">🕶️</span>
												</div>
												<div>
													<div className="flex items-center gap-2">
														<span className="font-semibold text-slate-800 text-lg">{j.displayName || "Anonymous"}</span>
														{getMoodEmoji(j.mood) && <span className="text-2xl">{getMoodEmoji(j.mood)}</span>}
													</div>
													<div className="text-sm text-slate-500">
														{getRelativeTime(j.createdAt)} • {new Date(j.createdAt).toLocaleDateString()}
													</div>
												</div>
											</div>
										</div>

										{/* Post Content */}
										<div className="mb-6">
											<p className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap">{j.content}</p>
											{renderAttachments(j)}
										</div>
				
										{/* Interaction Section */}
										<div className="border-t border-slate-200 pt-4">
											{/* Like and Comment Buttons */}
											<div className="flex items-center gap-6">
												<button 
													onClick={() => handleLike(j.journalId)} 
													className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
														likedPosts.has(j.journalId) 
															? "bg-red-100 text-red-600 hover:bg-red-200 border-2 border-red-200" 
															: "bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-slate-200"
													} ${isAnonymous ? "opacity-50 cursor-not-allowed" : ""}`}
													disabled={isAnonymous}
												>
													<Heart size={18} className={likedPosts.has(j.journalId) ? "fill-current" : ""} />
													<span className="font-medium">
														{likedPosts.has(j.journalId) ? "Liked" : "Like"}
													</span>
													{interactions[j.journalId]?.likes && interactions[j.journalId].likes.length > 0 && (
														<span className="text-xs bg-white text-slate-600 px-2 py-1 rounded-full font-semibold">
															{interactions[j.journalId].likes.length}
														</span>
													)}
												</button>
												
												<button 
													onClick={() => {
														if (isAnonymous) {
															alert("Please sign in to view comments");
															return;
														}
														const newShowComments = new Set(showComments);
														if (showComments.has(j.journalId)) {
															newShowComments.delete(j.journalId);
														} else {
															newShowComments.add(j.journalId);
														}
														setShowComments(newShowComments);
													}}
													className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-slate-200 transition-all duration-200 ${isAnonymous ? "opacity-50 cursor-not-allowed" : ""}`}
													disabled={isAnonymous}
												>
													<MessageCircle size={18} />
													<span className="font-medium">Comment</span>
													{interactions[j.journalId]?.comments && interactions[j.journalId].comments.length > 0 && (
														<span className="text-xs bg-white text-slate-600 px-2 py-1 rounded-full font-semibold">
															{interactions[j.journalId].comments.length}
														</span>
													)}
												</button>
											</div>

											{/* Comments Display - Only show when clicked */}
											{showComments.has(j.journalId) && interactions[j.journalId]?.comments && interactions[j.journalId].comments.length > 0 && (
												<div className="mt-4 space-y-3">
													<div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
														<Users size={16} />
														Comments ({interactions[j.journalId].comments.length})
													</div>
													<div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
														{interactions[j.journalId].comments.map((comment) => (
															<div key={comment.interactionId} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
																<div className="flex items-center gap-2 mb-2">
																	<span className="text-sm font-semibold text-slate-700">
																		{comment.userId === session?.user?.email ? "You" : "Anonymous"}
																	</span>
																	<span className="text-xs text-slate-500">
																		{new Date(comment.createdAt).toLocaleString()}
																	</span>
																</div>
																<p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>
															</div>
														))}
													</div>
												</div>
											)}

											{/* Comment Input Section */}
											{showComments.has(j.journalId) && (
												<div className="mt-4 space-y-3">
													<div className="flex gap-3">
														<input
															type="text"
															placeholder="Write a comment..."
															value={commentText[j.journalId] || ""}
															onChange={(e) => setCommentText(prev => ({ ...prev, [j.journalId]: e.target.value }))}
															className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
															onKeyPress={(e) => {
																if (e.key === 'Enter') {
																	handleComment(j.journalId);
																}
															}}
														/>
														<Button 
															onClick={() => handleComment(j.journalId)}
															disabled={!commentText[j.journalId]?.trim()}
															className="px-6 py-3 font-semibold"
														>
															Post
														</Button>
													</div>
												</div>
											)}
										</div>
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
