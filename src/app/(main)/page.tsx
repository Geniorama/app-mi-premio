import Image from "next/image";
import HomeView from "@/views/Home";

export default function Home() {
  return (
    <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
      <HomeView />
    </div>
  );
}
