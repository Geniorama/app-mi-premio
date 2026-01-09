"use client";

import logo from "@/img/logo-mi-premio.svg";
import Button from "@/utils/Button";
import Link from "next/link";
import { useState } from "react";
import iconUser from "@/img/user-check.svg";

export default function Header() { 
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    <div className="w-full bg-white py-3 px-2">
        <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <img className="w-full max-w-lg" src={logo.src} alt="logo" />
                <nav className="ml-16">
                    <ul className="flex items-center gap-10">
                        {navItems.map((item) => (
                            <li key={item.label}>
                                <Link className="text-black underline underline-offset-6 decoration-2 decoration-transparent hover:decoration-custom-green font-bold hover:text-custom-green transition-colors duration-300" href={item.href}>{item.label}</Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            <div>
                {isAuthenticated ? (
                    <div className="flex items-center gap-6">
                        <Button variant="secondary" onClick={handleLogin}>Salida segura</Button>
                        <span className="text-black font-bold">Juan Perez</span>
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
