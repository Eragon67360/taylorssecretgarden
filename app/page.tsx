
export default function Home() {
  return (
    <section className="w-screen h-screen bg-home bg-cover bg-no-repeat bg-center relative uppercase transition-all duration-300 pb-[120px] md:pb-[180px] lg:pb-[240px] xl:pb-[300px]">
      <h1 className="absolute top-8 text-xl md:text-2xl lg:text-3xl xl:text-4xl text-white w-full text-center font-[900] transition-all duration-300">Taylor Swift</h1>

      <div className="absolute bg-black/40 top-[108px] left-[58px] md:top-[144px] md:left-[118px] lg:top-[204px] lg:left-[178px] xl:top-[266px] xl:left-[230px] w-[74px] md:w-[84px] lg:w-[94px] transition-all duration-300">
        <p className="font-impact text-base md:text-lg lg:text-xl text-white">Who is taylor swift anyway? <span className="text-[#F00]">EW</span></p>
      </div>

      <div className="absolute bg-black/40 top-[264px] right-[56px] md:top-[324px] md:right-[176px] lg:top-[384px] lg:right-[296px] xl:top-[444px] xl:right-[416px] w-[74px] md:w-[84px] lg:w-[94px] transition-all duration-300">
        <p className="font-impact text-base md:text-lg lg:text-xl text-white">This&nbsp;<br /><span className="text-[#F00]">is not</span>&nbsp;<br />Taylor&apos;s version</p>
      </div>

      <div className="absolute bottom-[140px] left-[24px] md:bottom-[186px] md:left-[50px] lg:bottom-[246px] lg:left-[90px] xl:bottom-[306px] xl:left-[130px] w-[74px] md:w-[84px] lg:w-[94px] transition-all duration-300">
        <p className="font-impact text-base md:text-lg lg:text-xl text-white"><span className="text-[#F00]">A lot</span>&nbsp;<br />going on at the moment</p>
      </div>

    </section>
  );
}
