import { type Credit } from "@/lib/credits";

/**
 * A picture's credit in small print, its author linked to where it was
 * published when that is known. The full record (what it is, its terms) is
 * on the Credits page.
 */
export function MediaCredit({ credit }: { credit: Credit }) {
  return (
    <>
      ©{" "}
      {credit.url ? (
        <a className="focus-ring rounded-sm underline decoration-1 underline-offset-2 hover:decoration-2" href={credit.url} rel="noreferrer" target="_blank">
          {credit.author}
        </a>
      ) : (
        credit.author
      )}
    </>
  );
}
