import { type Credit } from "@/lib/credits";

const link = "focus-ring rounded-sm underline decoration-1 underline-offset-2 hover:decoration-2";

/**
 * A picture's credit in small print: its author, linked to where it was
 * published when that is known, and an open licence, linked to its deed.
 * The full record (what it is, what was changed) is on the Credits page.
 */
export function MediaCredit({ credit }: { credit: Credit }) {
  return (
    <>
      ©{" "}
      {credit.url ? (
        <a className={link} href={credit.url} rel="noreferrer" target="_blank">
          {credit.author}
        </a>
      ) : (
        credit.author
      )}
      {credit.licenceUrl && (
        <>
          {" · "}
          <a className={link} href={credit.licenceUrl} rel="license noreferrer" target="_blank">
            {credit.licence}
          </a>
        </>
      )}
    </>
  );
}
