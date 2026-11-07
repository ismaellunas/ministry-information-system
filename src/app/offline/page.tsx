import Image from "next/image";
import { OpenCalendarButton } from "./open-calendar-button";

export const metadata = { title: "West Section MIS" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-screen-sm flex-col justify-center gap-4 bg-gray-50 px-4 py-8">
      <div className="flex items-center gap-3">
        <Image
          src="/favicon.jpeg"
          alt="West MIS Logo"
          width={40}
          height={40}
          className="h-10 w-10 rounded-xl object-cover"
        />
        <h1 className="page-title">West MIS</h1>
      </div>
      <OpenCalendarButton />
    </main>
  );
}
