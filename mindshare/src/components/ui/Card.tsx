import React from "react";

export const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
	children,
	className = "",
}) => {
	return (
		<div className={`rounded-2xl bg-white/75 backdrop-blur shadow-md ${className}`}>
			{children}
		</div>
	);
};

export default Card;
