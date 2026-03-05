"use client";

import dynamic from "next/dynamic";

const CreateEvent = dynamic(() => import("@/components/CreateEvent"), { ssr: false });

export default function CreateEventClient() {
  return <CreateEvent />;
}
