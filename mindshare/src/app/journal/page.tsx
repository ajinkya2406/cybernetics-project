"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { Bold, Italic, List, X, Mic, MicOff, Image, Volume2 } from "lucide-react";
import { apiPost } from "@/lib/api";
import { uploadFiles, audioBlobToFile } from "@/lib/fileUpload";

export default function JournalPage() {
	const { data: session } = useSession();
	const [content, setContent] = useState("");
	const [privacy, setPrivacy] = useState<"private" | "anonymous">("private");
	const [mood, setMood] = useState<string>("");
	const [attachments, setAttachments] = useState<File[]>([]);
	const [saving, setSaving] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Voice recording functions
	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			
			const audioChunks: Blob[] = [];
			mediaRecorder.ondataavailable = (event) => {
				audioChunks.push(event.data);
			};
			
			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
				setAudioBlob(audioBlob);
				const url = URL.createObjectURL(audioBlob);
				setAudioUrl(url);
				stream.getTracks().forEach(track => track.stop());
			};
			
			mediaRecorder.start();
			setIsRecording(true);
			toast.success("Recording started");
		} catch (error) {
			toast.error("Could not access microphone");
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
			setIsRecording(false);
			toast.success("Recording stopped");
		}
	};

	const playAudio = () => {
		if (audioUrl) {
			const audio = new Audio(audioUrl);
			audio.play();
		}
	};

	const removeAudio = () => {
		if (audioUrl) {
			URL.revokeObjectURL(audioUrl);
		}
		setAudioBlob(null);
		setAudioUrl(null);
	};

	// File handling functions
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		const imageFiles = files.filter(file => file.type.startsWith('image/'));
		if (imageFiles.length !== files.length) {
			toast.error("Please select only image files");
		}
		setAttachments(prev => [...prev, ...imageFiles]);
	};

	const removeAttachment = (index: number) => {
		setAttachments(prev => prev.filter((_, i) => i !== index));
	};

	async function onSave() {
		if (!session?.user?.email) {
			toast.error("Please sign in to save journal");
			return;
		}
		
		setSaving(true);
		try {
			// First create/get user, then create journal
			const userResponse = await apiPost<{ data: { userId: string; displayName: string } }>("/api/users", { 
				email: session.user.email, 
				displayName: session.user.name,
				avatarUrl: session.user.image 
			});
			
			// Upload files to S3
			let uploadedFiles: any[] = [];
			let audioFile: any = null;
			
			if (attachments.length > 0) {
				toast.loading("Uploading images...");
				uploadedFiles = await uploadFiles(attachments, 'images');
				toast.dismiss();
			}
			
			if (audioBlob) {
				toast.loading("Uploading voice note...");
				const audioFileObj = audioBlobToFile(audioBlob, `voice-note-${Date.now()}.wav`);
				audioFile = await uploadFiles([audioFileObj], 'audio');
				toast.dismiss();
			}
			
			// Prepare attachments data with uploaded file URLs
			const attachmentData = {
				images: uploadedFiles.map(f => ({
					name: f.fileName,
					size: f.size,
					type: f.type,
					url: f.url
				})),
				audio: audioFile && audioFile.length > 0 ? {
					size: audioFile[0].size,
					type: audioFile[0].type,
					url: audioFile[0].url
				} : null
			};
			
			await apiPost("/api/journals", { 
				userId: userResponse.data.userId,
				displayName: userResponse.data.displayName,
				content, 
				mood, 
				privacy, 
				attachments: attachmentData
			});

			// Also save mood if one was selected
			if (mood) {
				console.log("Saving mood from journal:", { userId: userResponse.data.userId, mood, content: content.substring(0, 50) });
				try {
					const moodResponse = await apiPost("/api/moods", {
						userId: userResponse.data.userId,
						mood: mood,
						note: `Mood from journal: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
					});
					console.log("Mood saved successfully:", moodResponse);
				} catch (e) {
					console.error("Failed to save mood:", e);
				}
			} else {
				console.log("No mood selected for journal entry");
			}

			if (mood) {
				toast.success("Journal saved and mood tracked!");
			} else {
				toast.success("Journal saved");
			}
			setContent("");
			setMood("");
			setAttachments([]);
			removeAudio();
		} catch (e: any) {
			toast.error(e?.message ?? "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4 py-8">
			<div className="w-full max-w-4xl">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-slate-800 mb-2">Write Your Journal</h1>
					<p className="text-lg text-slate-600">Capture your thoughts and feelings in a safe space</p>
				</div>

				<Card className="p-8 shadow-xl border-2 border-slate-200">
					{/* Toolbar */}
					<div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
						<div className="flex items-center gap-2">
							<button className="h-10 w-10 rounded-xl hover:bg-slate-100 grid place-items-center transition-colors" title="Bold">
								<Bold size={20} className="text-slate-600" />
							</button>
							<button className="h-10 w-10 rounded-xl hover:bg-slate-100 grid place-items-center transition-colors" title="Italic">
								<Italic size={20} className="text-slate-600" />
							</button>
							<button className="h-10 w-10 rounded-xl hover:bg-slate-100 grid place-items-center transition-colors" title="Bullets">
								<List size={20} className="text-slate-600" />
							</button>
						</div>
						<div className="flex items-center gap-4 text-sm">
							<label className="inline-flex items-center gap-2 cursor-pointer">
								<input 
									type="radio" 
									name="privacy" 
									className="accent-purple-500" 
									checked={privacy === "private"} 
									onChange={() => setPrivacy("private")} 
								/>
								<span className="font-medium text-slate-700">🔒 Private</span>
							</label>
							<label className="inline-flex items-center gap-2 cursor-pointer">
								<input 
									type="radio" 
									name="privacy" 
									className="accent-sky-500" 
									checked={privacy === "anonymous"} 
									onChange={() => setPrivacy("anonymous")} 
								/>
								<span className="font-medium text-slate-700">🌐 Share Anonymously</span>
							</label>
						</div>
					</div>

					{/* Text Area */}
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						placeholder="Start writing your thoughts…"
						className="w-full min-h-[300px] outline-none resize-y p-6 rounded-2xl bg-slate-50 focus:ring-2 focus:ring-blue-300 border-2 border-slate-200 text-slate-700 text-lg leading-relaxed"
					/>

					{/* Mood Selection */}
					<div className="mt-6">
						<label className="text-sm font-semibold text-slate-700 mb-2 block">Mood (optional)</label>
						<select 
							value={mood} 
							onChange={(e) => setMood(e.target.value)}
							className="w-full h-12 rounded-xl border-2 border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-blue-300 text-slate-700 font-medium"
						>
							<option value="">Select mood...</option>
							<option value="happy">😊 Happy</option>
							<option value="sad">😔 Sad</option>
							<option value="anxious">😟 Anxious</option>
							<option value="calm">😌 Calm</option>
							<option value="neutral">😐 Neutral</option>
						</select>
						{mood && (
							<p className="text-sm text-green-600 mt-2 font-medium">
								✓ This mood will be automatically tracked in your mood trends
							</p>
						)}
					</div>

					{/* Attachments Preview */}
					{(attachments.length > 0 || audioBlob) && (
						<div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
							<h4 className="text-sm font-semibold text-slate-700 mb-3">Attachments:</h4>
							<div className="space-y-3">
								{attachments.map((file, index) => (
									<div key={index} className="flex items-center gap-3 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
										<Image size={18} className="text-blue-500" />
										<span className="font-medium">{file.name}</span>
										<span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
										<button 
											onClick={() => removeAttachment(index)}
											className="text-red-500 hover:text-red-700 ml-auto p-1 rounded hover:bg-red-50"
										>
											<X size={16} />
										</button>
									</div>
								))}
								{audioBlob && (
									<div className="flex items-center gap-3 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
										<Volume2 size={18} className="text-green-500" />
										<span className="font-medium">Voice Note ({(audioBlob.size / 1024).toFixed(1)} KB)</span>
										<button 
											onClick={playAudio}
											className="text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
										>
											Play
										</button>
										<button 
											onClick={removeAudio}
											className="text-red-500 hover:text-red-700 ml-auto p-1 rounded hover:bg-red-50"
										>
											<X size={16} />
										</button>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
						<div className="flex items-center gap-3">
							<label className="inline-flex items-center gap-2 cursor-pointer">
								<input 
									ref={fileInputRef}
									type="file" 
									className="hidden" 
									accept="image/*"
									multiple
									onChange={handleFileSelect}
								/>
								<button className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 text-slate-700 font-medium">
									<Image size={18} />
									<span className="whitespace-nowrap">Upload Images</span>
								</button>
							</label>
							{!isRecording ? (
								<button 
									onClick={startRecording}
									className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 text-slate-700 font-medium"
								>
									<Mic size={18} />
									<span className="whitespace-nowrap">Record Voice</span>
								</button>
							) : (
								<button 
									onClick={stopRecording}
									className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all duration-200 text-red-600 font-medium"
								>
									<MicOff size={18} />
									<span className="whitespace-nowrap">Stop Recording</span>
								</button>
							)}
						</div>
						<Button 
							onClick={onSave} 
							disabled={saving} 
							className="px-8 py-3 text-lg font-semibold min-w-[120px]"
						>
							{saving ? "Saving..." : "Save Journal"}
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
