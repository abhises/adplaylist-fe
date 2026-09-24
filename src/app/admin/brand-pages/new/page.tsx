"use client";

import { useRouter } from "next/navigation";
import BrandPageEditor from "@/components/BrandPageEditor";
import { api } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

export default function NewBrandPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const router = useRouter();

  if (!ready || !user) return null;

  return (
    <BrandPageEditor
      onSave={async (data) => {
        const { page } = await api.createBrandPage(data);
        router.replace(`/admin/brand-pages/${page.id}`);
      }}
    />
  );
}
