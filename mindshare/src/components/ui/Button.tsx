"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "danger" | "ghost";
	full?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
	className = "",
	children,
	variant = "primary",
	full = false,
	...props
}) => {
	const base =
		"inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300";
	const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
		primary:
			"bg-gradient-to-r from-purple-600 to-sky-500 text-white shadow-md hover:shadow-lg hover:brightness-105",
		secondary:
			"bg-sky-600 text-white hover:bg-sky-700 shadow-md",
		danger:
			"bg-rose-600 text-white hover:bg-rose-700 shadow-md",
		ghost:
			"bg-white/70 text-slate-700 hover:bg-white border border-slate-200",
	};
	const sizing = full ? "w-full h-11 px-5" : "h-10 px-4";

	return (
		<button className={`${base} ${variants[variant]} ${sizing} ${className}`} {...props}>
			{children}
		</button>
	);
};

export default Button;
