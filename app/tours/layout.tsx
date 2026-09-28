export default function ToursLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="w-dvw h-screen">
      {children}
    </section>
  );
}
