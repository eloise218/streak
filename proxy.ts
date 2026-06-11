import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on every route except static assets, image optimization, and PWA
    // metadata routes (manifest + generated icons). Without the manifest
    // exclusion, an unauthenticated visit to /manifest.webmanifest gets
    // redirected to /login by the Supabase proxy, which silently breaks the
    // browser's install prompt.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|icon1|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};
