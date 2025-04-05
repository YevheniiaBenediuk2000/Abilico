"use client";

import dynamic from "next/dynamic";

const LazyMap = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

export default function MapWrapper() {
  return <LazyMap />;
}
