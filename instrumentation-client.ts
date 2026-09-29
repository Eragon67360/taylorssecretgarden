import { initBotId } from "botid/client/core";

import { BOTID_PROTECTED_ROUTES } from "@/lib/botid-routes";

// Vercel BotID: attaches its token to requests to the routes it guards
// (lib/botid-routes.ts). Its challenge script loads only when such a request
// is made, so pages that never sign in or publish download nothing more.
initBotId({ protect: BOTID_PROTECTED_ROUTES });
