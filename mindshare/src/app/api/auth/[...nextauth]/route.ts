import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		}),
	],
	callbacks: {
		async signIn({ user, account, profile }) {
			try {
				await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/users`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email: user.email, displayName: user.name, avatarUrl: user.image }),
				});
				return true;
			} catch {
				return true; // allow login even if user creation fails
			}
		},
		async session({ session }) {
			return session;
		},
	},
	secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
