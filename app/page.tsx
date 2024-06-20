
export default function Home() {
  return (
    <section className="w-screen h-screen bg-home bg-cover bg-no-repeat relative uppercase">
      <h1 className="absolute top-8 text-4xl text-white w-full text-center font-[900]">Taylor Swift</h1>

      <div className="absolute top-[266px] left-[230px] w-[94px]">
        <p className="font-impact text-xl text-white">Who is taylor swift anyway? <span className="text-[#F00]">EW</span></p>
      </div>

      <div className="absolute top-[444px] right-[416px] w-[94px]">
        <p className="font-impact text-xl text-white">This&nbsp;<br /><span className="text-[#F00]">is not</span>&nbsp;<br />Taylor&apos;s version</p>
      </div>

      <div className="absolute bottom-[306px] left-[130px] w-[94px]">
        <p className="font-impact text-xl text-white"><span className="text-[#F00]">A lot</span>&nbsp;<br />going on at the moment</p>
      </div>

    </section>
  );
}
