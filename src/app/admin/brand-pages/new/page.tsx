"use client";

import { useRouter } from "next/navigation";
import BrandPageEditor from "@/components/BrandPageEditor";
import { api } from "@/lib/api";
import { useRequirePermission } from "@/lib/AuthProvider";
import { useToast } from "@/lib/ToastProvider";

export default function NewBrandPage() {
  const { user, ready } = useRequirePermission("brandPages");
  const router = useRouter();
  const toast = useToast();

  if (!ready || !user) return null;

  return (
    <BrandPageEditor
      onSave={async (data) => {
        const { page } = await api.createBrandPage(data);
        toast.success("Brand page created.");
        router.replace(`/admin/brand-pages/${page.id}`);
      }}
    />
  );
}
