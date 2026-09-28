/** A journal page's heading: a small printed page number, a serif title and an optional pencilled aside. */
export function SectionHead({ id, kicker, title, aside }: { id: string; kicker: string; title: string; aside?: string }) {
  return (
    <div>
      <p className="text-soft text-[11px] font-bold tracking-[.26em] uppercase">{kicker}</p>
      <h2 className="font-serif mt-2 text-[clamp(2.1rem,5vw,3.6rem)] leading-none font-semibold tracking-[-0.015em] text-balance" id={id}>
        {title}
      </h2>
      {aside && (
        <p className="font-hand text-accent mt-2 rotate-[-1.5deg] text-[22px] font-bold">
          <span aria-hidden="true">↳ </span>
          {aside}
        </p>
      )}
    </div>
  );
}
