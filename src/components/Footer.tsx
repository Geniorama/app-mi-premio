import logo from "@/img/logo-dark.svg";
import iconFacebook from "@/img/facebook-fill.svg";
import iconInstagram from "@/img/instagram-fill.svg";
import iconLinkedin from "@/img/linkedin-fill.svg";
import iconYoutube from "@/img/youtube-fill.svg";
import Link from "next/link";
import Container from "@/utils/Container";

export default function Footer() {
  const menuCol1 = [
    {
      label: "Home",
      href: "#",
      target: "_blank",
    },
    {
      label: "Pricing",
      href: "#",
      target: "_blank",
    },
    {
      label: "Community",
      href: "#",
      target: "_blank",
    },
    {
      label: "Support",
      href: "#",
      target: "_blank",
    },
  ];

  const menuCol2 = [
    {
      label: "Home",
      href: "#",
      target: "_blank",
    },
    {
      label: "Pricing",
      href: "#",
      target: "_blank",
    },
    {
      label: "Community",
      href: "#",
      target: "_blank",
    },
  ];

  const socialMedia = [
    {
      label: "Facebook",
      href: "#",
      target: "_blank",
      icon: iconFacebook,
    },
    {
      label: "Instagram",
      href: "#",
      target: "_blank",
      icon: iconInstagram,
    },
    {
      label: "Linkedin",
      href: "#",
      target: "_blank",
      icon: iconLinkedin,
    },
    {
      label: "Youtube",
      href: "#",
      target: "_blank",
      icon: iconYoutube,
    },
  ];

  return (
    <footer className="w-full bg-[#195308] pt-12 pb-8">
      <Container>
        <div className="w-full flex items-center justify-between">
          <div className="w-full lg:w-1/3">
            <ul className="flex items-center justify-between gap-4">
              {menuCol1.map((item) => (
                <li key={item.label}>
                  <Link
                    className="text-white font-bold"
                    target={item.target}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full lg:w-1/3">
            <img
              className="w-full max-w-[150px] mx-auto"
              src={logo.src}
              alt="logo"
            />
          </div>
          <div className="w-full lg:w-1/3">
            <ul className="flex items-center justify-between gap-4">
              {menuCol2.map((item) => (
                <li key={item.label}>
                  <Link
                    className="text-white font-bold"
                    target={item.target}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center">
            <ul className="flex items-center justify-center gap-4">
                {socialMedia.map((item) => (
                    <li key={item.label}>
                        <Link className="h-12 w-12 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 transition-colors duration-300 rounded-full" href={item.href}>
                            <img src={item.icon.src} alt={item.label} className="w-6 h-6" />
                        </Link>
                    </li>
                ))}
            </ul>

            <p className="text-white mt-8 text-sm">© Photo, Inc. 2019. We love our users!</p>
        </div>
      </Container>
    </footer>
  );
}
