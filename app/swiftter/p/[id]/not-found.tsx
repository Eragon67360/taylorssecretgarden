import { TornPage, WayOut } from "@/components/torn-page";

/**
 * A thread that is not public: no such note, or one moderation has not passed
 * (only its author sees it, on the feed). A note torn up by its author still
 * has its page while anything points at it (the thread page shows it torn up).
 */
export default function ThreadNotFound() {
  return (
    <TornPage aside="it was never passed along, or it got lost in the shuffle." kicker="404 · note not found" title="This note isn't on Swiftter.">
      <p className="text-soft max-w-[34rem] text-[17px] leading-relaxed">The link may be mistyped, or the note is only visible to the Member who wrote it.</p>
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
