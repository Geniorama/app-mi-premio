"use client";

import logo from "@/img/logo-mi-premio.svg";
import Button from "@/utils/Button";
import Link from "next/link";
import { useState } from "react";
import iconUser from "@/img/user-check.svg";
import { useRouter } from "next/navigation";
import { FcMenu } from "react-icons/fc";


export default function Header() { 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  //Esta funcion esta pensada para simular el login y logout, en un futuro se debe cambiar por una llamada a la API
  const handleLogin = () => {
    setIsAuthenticated(!isAuthenticated);
  };

  const navItems = [
    {
        label: "Home",
        href: "#",
    },
    {
        label: "Pricing",
        href: "#",
    },
    {
        label: "Community",
        href: "#",
    },
    {
        label: "Support",
        href: "#",
    },
  ];

  return (
    <div className="w-full bg-white">

        {/* Top bar */}
        <div className="w-full bg-custom-green py-2 px-2 lg:hidden">
        <Button variant={isAuthenticated ? "tertiary" : "secondary"} onClick={handleLogin} className={`w-full h-8! uppercase`}>
            {isAuthenticated ? "Logout" : "Login"}
        </Button>
        </div>
        <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between py-3 px-2">
            <div className="flex justify-between items-center lg:justify-start w-full gap-4 px-2 lg:px-0">
                <img className="w-full max-w-18 lg:max-w-28 cursor-pointer" onClick={() => router.push("/")} src={logo.src} alt="logo" />

                {/* Toogle mobile menu */}
                <div className="lg:hidden">
                    <button className="border border-slate-200 rounded-lg p-2 w-12 h-12 flex items-center justify-center">
                        <FcMenu className="text-3xl" />
                    </button>
                </div>

                <nav className="ml-16 hidden lg:block">
                    <ul className="flex items-center gap-10">
                        {navItems.map((item) => (
                            <li key={item.label}>
                                <Link className="text-black underline underline-offset-6 decoration-2 decoration-transparent hover:decoration-custom-green font-bold hover:text-custom-green transition-colors duration-300" href={item.href}>{item.label}</Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            <div className="hidden lg:block">
                {isAuthenticated ? (
                    <div className="flex items-center gap-6">
                        <Button variant="secondary" className="whitespace-nowrap" onClick={handleLogin}>Salida segura</Button>
                        <span className="text-black font-bold whitespace-nowrap">Juan Perez</span>
                        <img className="w-6 h-6 ml-8" src={iconUser.src} alt="icon-user" />
                    </div>
                ) : (
                    <Button variant="secondary" onClick={handleLogin}>Login</Button>
                )}
            </div>
        </div>
    </div>
  )
}
