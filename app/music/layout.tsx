export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col items-center justify-center pb-24">
      <div className="container">
        {children}
      </div>
    </section>
  );
}
