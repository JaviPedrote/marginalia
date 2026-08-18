"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
      className="mt-auto self-start text-sm text-slate-500 underline underline-offset-4"
    >
      Cerrar sesión
    </button>
  );
}
