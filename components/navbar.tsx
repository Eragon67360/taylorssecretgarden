"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const sections = [
  { name: "Home", path: "/" },
  { name: "Music", path: "/music" },
  { name: "Tours", path: "/tours" },
  { name: "Swiftter", path: "/swiftter" },
];

// A section is current on its own path and on every page below it
// (e.g. /tours/the-eras-tour is under Tours).
function isCurrent(pathname: string, path: string) {
  if (path === "/") return pathname === "/";

  return pathname === path || pathname.startsWith(`${path}/`);
}

const Navbar = () => {
  const pathname = usePathname();

  return (
    <>
      <div className="fixed z-50 bottom-0 bg-custom-gradient w-dvw h-[80px] md:h-[180px] lg:h-[240px] xl:h-[300px] flex justify-center items-end pb-4 md:pb-8 lg:pb-12 xl:pb-14 overflow-x-hidden">
        <nav aria-label="Main" className="w-fit  px-4 md:px-5 lg:px-6 xl:px-8 py-3 md:py-2 lg:py-3 flex justify-center items-center rounded-full bg-black text-white uppercase">
          <ul className="flex items-center justify-center relative gap-4 md:gap-5 lg:gap-6 xl:gap-8">
            {sections.map((section) => {
              const current = isCurrent(pathname, section.path);

              return (
                <li key={section.path} className="">
                  <Link
                    aria-current={current ? "page" : undefined}
                    className="flex flex-col text-center cursor-pointer text-xs md:text-base"
                    href={section.path}>
                    <span
                      className={` ${current
                        ? "duration-700 opacity-100 font-bold"
                        : "opacity-70"
                        } `}
                    >
                      {section.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Navbar;
