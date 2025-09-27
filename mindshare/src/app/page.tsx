"use client";

import { useEffect } from "react";

export default function Home() {
	useEffect(() => {
		const user = localStorage.getItem("mindshare_user");
		location.replace(user ? "/dashboard" : "/login");
	}, []);
	return null;
}
