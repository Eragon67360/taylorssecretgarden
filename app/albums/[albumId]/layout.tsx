export default function AlbumLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col items-center justify-center pb-[300px]">
            <div className="container">
                {children}
            </div>
        </section>
    );
}
