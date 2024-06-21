"use client"
import Link from "next/link";
import React, { useState } from "react";

const Navbar = () => {
  const Menus = [
    { name: "Home", path: "/" },
    { name: "Music", path: "/music" },
    { name: "Tours", path: "/tours" },
    { name: "Events", path: "/events" },
    { name: "Forum", path: "/forum" },
  ];

  const [active, setActive] = useState(0);

  return (
    <>
      <div className="fixed z-50 bottom-0 bg-custom-gradient w-[100dvw] h-[80px] md:h-[180px] lg:h-[240px] xl:h-[300px] flex justify-center items-end pb-4 md:pb-8 lg:pb-12 xl:pb-14 overflow-x-hidden">
        <div className="w-fit  px-4 md:px-5 lg:px-6 xl:px-8 py-3 md:py-2 lg:py-3 flex justify-center items-center rounded-full bg-black text-white uppercase">
          <ul className="flex items-center justify-center relative gap-4 md:gap-5 lg:gap-6 xl:gap-8">
            {Menus.map((menu, i) => (
              <li key={i} className="">
                <Link
                  className="flex flex-col text-center cursor-pointer text-xs md:text-base"
                  onClick={() => setActive(i)}
                  href={menu.path}>
                  <span
                    className={` ${active === i
                      ? "duration-700 opacity-100 font-bold"
                      : "opacity-70"
                      } `}
                  >
                    {menu.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

      </div>


    </>

  );
};

export default Navbar;
