import { Suspense } from "react";
import ShareClient from "./ui/ShareClient";

export default function SharePage() {
  return (
    <Suspense fallback={null}>
      <ShareClient />
    </Suspense>
  );
}


