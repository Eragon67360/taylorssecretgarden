export default function TourLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <section className="w-[100dvw] h-screen bg-white flex flex-col items-center">
            <div className="container max-w-[1180px]">
                {children}
            </div>
        </section>
    );
}
