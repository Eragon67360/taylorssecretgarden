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
      <div className="fixed z-50 bottom-0 bg-custom-gradient w-[100dvw] h-[300px] flex justify-center items-end pb-14 overflow-x-hidden">
        <div className="w-fit h-12 px-8 py-3 flex justify-center items-center rounded-full bg-black text-white uppercase">
          <ul className="flex items-center justify-center relative gap-8">
            {Menus.map((menu, i) => (
              <li key={i} className="">
                <Link
                  className="flex flex-col text-center cursor-pointer"
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
