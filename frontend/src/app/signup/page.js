"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-mesh">
      <div className="w-8 h-8 border-4 rounded-full animate-spin border-[#E5E7EB] border-t-[#0F766E]" />
    </div>
  );
}
