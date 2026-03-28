"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = window.localStorage.getItem("activeUser");
    if (user) {
      router.replace("/dashboard");
      return;
    }
    router.replace("/login");
  }, [router]);

  return <div className="card">Redirecting...</div>;
}
