import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { apiKey, emailOTP, organization } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/node-postgres";

// biome-ignore lint/style/noNonNullAssertion: <explanation>
const db = drizzle(process.env.DATABASE_URL!);

// In-memory storage implementation
const memoryStore = new Map<string, { value: string; expires?: number }>();

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg", // or "mysql", "sqlite"
	}),
	emailAndPassword: {
		enabled: true,
	},
	secondaryStorage: {
		async get(key: string) {
			const item = memoryStore.get(key);
			if (!item) return null;
			if (item.expires && item.expires < Date.now()) {
				memoryStore.delete(key);
				return null;
			}
			return item.value;
		},
		async set(key: string, value: string, ttl?: number) {
			memoryStore.set(key, {
				value,
				expires: ttl ? Date.now() + ttl * 1000 : undefined,
			});
		},
		async delete(key: string) {
			memoryStore.delete(key);
		},
	},
	plugins: [
		organization(),
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				// Implement the sendVerificationOTP method to send the OTP to the user's email address
			},
		}),
		apiKey(),
	],
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
	},
});
