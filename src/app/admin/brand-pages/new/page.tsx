"use client";

import { useRouter } from "next/navigation";
import BrandPageEditor from "@/components/BrandPageEditor";
import { api } from "@/lib/api";
import { useRequirePermission } from "@/lib/AuthProvider";

export default function NewBrandPage() {
  const { user, ready } = useRequirePermission("brandPages");
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
