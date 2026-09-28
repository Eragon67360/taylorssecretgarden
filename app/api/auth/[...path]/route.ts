import { getAuth } from "@/lib/auth/server";

/*
  Neon Auth's API on this origin: sign-up, sign-in (email and Google),
  sign-out and the session. Every request is proxied to the branch's Neon Auth
  URL, and its session cookies are set here, first-party.
*/
type Context = { params: Promise<{ path: string[] }> };

const handler = (request: Request, context: Context) => {
	const methods = getAuth().handler();

	return methods[request.method as keyof typeof methods](request, context);
};

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
