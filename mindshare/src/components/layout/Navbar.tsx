"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";
import UsernameModal from "@/components/ui/UsernameModal";
import { signOut } from "next-auth/react";
import { Edit3, Menu, X, PenTool, Heart, Users, BookOpen, LogOut } from "lucide-react";

type Props = {
	user?: { 
		displayName: string; 
		avatarUrl?: string; 
		userId?: string;
		originalName?: string;
		anonymousName?: string;
	} | null;
	onLogout?: () => void;
	onUsernameChange?: (newUsername: string) => void;
};

export default function Navbar({ user, onLogout, onUsernameChange }: Props) {
	const [showUsernameModal, setShowUsernameModal] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const handleUsernameChange = (newUsername: string) => {
		onUsernameChange?.(newUsername);
	};

	const navigationItems = [
		{ href: "/journal", label: "Write Journal", icon: PenTool },
		{ href: "/mood", label: "Track Mood", icon: Heart },
		{ href: "/feed", label: "Community Feed", icon: Users },
		{ href: "/history", label: "Journal History", icon: BookOpen },
	];

	return (
		<>
			<header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-lg">
				<div className="w-full px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						{/* Logo */}
						<Link 
							href="/dashboard" 
							className="flex items-center gap-3 text-xl font-bold text-slate-800 hover:text-slate-600 transition-colors flex-shrink-0"
						>
							<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
								<span className="text-white font-bold text-lg">M</span>
							</div>
							<span className="hidden sm:block">MindShare</span>
						</Link>

						{/* Desktop Navigation - Centered */}
						<nav className="hidden lg:flex items-center justify-center flex-1 px-8">
							<div className="flex items-center nav-container">
								{navigationItems.map((item, index) => {
									const Icon = item.icon;
									return (
										<Link
											key={item.href}
											href={item.href}
											className={`flex items-center gap-2 px-6 py-3 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 font-medium whitespace-nowrap border border-transparent hover:border-slate-200 hover:shadow-sm nav-button ${index < navigationItems.length - 1 ? '' : 'last-button'}`}
										>
											<Icon size={18} />
											<span>{item.label}</span>
										</Link>
									);
								})}
							</div>
						</nav>

						{/* User Profile & Actions */}
						<div className="flex items-center gap-4 flex-shrink-0">
							{/* User Profile */}
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 border-2 border-white shadow-md">
									{user?.avatarUrl ? (
										<Image src={user.avatarUrl} alt="avatar" width={40} height={40} className="object-cover" />
									) : (
										<div className="h-full w-full flex items-center justify-center text-lg">🙂</div>
									)}
								</div>
								<div className="hidden sm:flex items-center gap-2">
									<span className="text-sm font-medium text-slate-700 whitespace-nowrap">{user?.displayName ?? "Guest"}</span>
									{user?.userId && (
										<button
											onClick={() => setShowUsernameModal(true)}
											className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
											title="Change username"
										>
											<Edit3 size={16} className="text-slate-500" />
										</button>
									)}
								</div>
							</div>

							{/* Logout Button */}
							<Button 
								variant="ghost" 
								onClick={() => signOut({ callbackUrl: "/login" })}
								className="hidden sm:flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2"
							>
								<LogOut size={16} />
								<span>Logout</span>
							</Button>

							{/* Mobile Menu Button */}
							<button
								onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
								className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
							>
								{isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
							</button>
						</div>
					</div>

					{/* Mobile Navigation */}
					{isMobileMenuOpen && (
						<div className="lg:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-md">
							<div className="px-3 pt-3 pb-4 space-y-2">
								{navigationItems.map((item) => {
									const Icon = item.icon;
									return (
										<Link
											key={item.href}
											href={item.href}
											onClick={() => setIsMobileMenuOpen(false)}
											className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 font-medium border border-transparent hover:border-slate-200 hover:shadow-sm"
										>
											<Icon size={20} />
											<span>{item.label}</span>
										</Link>
									);
								})}
								<div className="border-t border-slate-200/60 pt-3 mt-3">
									<button
										onClick={() => {
											signOut({ callbackUrl: "/login" });
											setIsMobileMenuOpen(false);
										}}
										className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 font-medium border border-transparent hover:border-slate-200 hover:shadow-sm"
									>
										<LogOut size={20} />
										<span>Logout</span>
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</header>

			{/* Username Modal */}
			{user?.userId && (
				<UsernameModal
					isOpen={showUsernameModal}
					onClose={() => setShowUsernameModal(false)}
					currentUsername={user.displayName || "User"}
					userId={user.userId}
					onUsernameChange={handleUsernameChange}
					userData={{
						originalName: user.originalName,
						anonymousName: user.anonymousName
					}}
				/>
			)}
		</>
	);
}
