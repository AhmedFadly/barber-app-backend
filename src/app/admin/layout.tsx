import { paymentsMode } from "@/lib/payments";

import { Nav } from "./_components/nav";
import "./admin.css";

// Everything here reads live data.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">REGENT</div>
          <div className="brand-sub">Admin console</div>
        </div>
        <Nav />
        <div className="sidebar-foot">
          Payments: <span className="gold">{paymentsMode === "stripe" ? "Stripe live" : "Demo mode"}</span>
          <br />
          Times shown in Dubai (GST)
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
