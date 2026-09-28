import { ClerkProvider } from "@clerk/nextjs";

/*
  The guestbook (sign-in, sign-up): Clerk's prebuilt forms. Clerk loads only
  here and on Swiftter (app/swiftter/layout.tsx), never on Home, Music or
  Tours, which do not ask who is signed in.
*/
export default function GuestbookLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
