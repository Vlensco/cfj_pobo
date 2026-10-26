import { trpc } from "@/lib/trpc";
import { ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type AdminSection = "orders" | "catalog";

type Props = {
  active: AdminSection;
  eyebrow: string;
  title: string;
  description: string;
};

const SECTIONS: Array<{ id: AdminSection; href: string; label: string }> = [
  { id: "orders", href: "/admin/orders", label: "Order Requests" },
  { id: "catalog", href: "/admin/catalog", label: "Catalog (CMS)" },
];

/** Page heading shared by the admin screens, with section tabs and sign-out. */
export function AdminHeader({ active, eyebrow, title, description }: Props) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Signed out successfully");
      setLocation("/admin/login");
    },
  });

  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="admin-nav-actions">
        {SECTIONS.map(section => (
          <Link
            key={section.id}
            href={section.href}
            className={`admin-nav-tab ${section.id === active ? "active" : ""}`}
          >
            {section.label}
          </Link>
        ))}
        <Link href="/" className="admin-store-link">
          Storefront <ExternalLink size={12} />
        </Link>
        <button className="admin-logout-btn" onClick={() => logoutMutation.mutate()} title="Sign out">
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
