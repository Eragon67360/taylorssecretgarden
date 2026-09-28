import { clerkSetup } from "@clerk/testing/playwright";

// Fetches a Clerk testing token (with CLERK_SECRET_KEY) so signed-in tests get
// past Clerk's bot protection. Reads .env.local when the keys are not already
// in the environment.
export default async function globalSetup() {
	await clerkSetup();
}
