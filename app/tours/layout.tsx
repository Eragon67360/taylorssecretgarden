export default function ToursLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="w-[100dvw] h-screen">
      {children}
    </section>
  );
}
