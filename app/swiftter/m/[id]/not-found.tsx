import { TornPage, WayOut } from "@/components/torn-page";

/**
 * No Member's page here: no such Member, or one who deleted their account
 * (their notes were torn up and their name taken off them).
 */
export default function MemberNotFound() {
  return (
    <TornPage aside="nobody signed the guestbook under that name, or they've since left." kicker="404 · Member not found" title="This page isn't in the guestbook.">
      <p className="text-soft max-w-[34rem] text-[17px] leading-relaxed">The link may be mistyped, or the Member deleted their account.</p>
      <div className="mt-5">
        <WayOut
          label="Back to Swiftter"
          links={[
            { href: "/swiftter", name: "all notes" },
            { href: "/", name: "Home" },
          ]}
        />
      </div>
    </TornPage>
  );
}
