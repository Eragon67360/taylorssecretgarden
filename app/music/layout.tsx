export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white flex flex-col items-center justify-center pb-[300px]">
      <div className="container">
        {children}
      </div>
    </section>
  );
}
