export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white flex flex-col items-center justify-center py-8 md:py-16 lg:py-32 pb-[80px] md:pb-[180px] lg:pb-[240px] xl:pb-[300px]">
      <div className="container">
        {children}
      </div>
    </section>
  );
}
