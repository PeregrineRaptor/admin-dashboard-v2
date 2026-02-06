import BrandNameLogo from "@/components/common/BrandNameLogo";
import DashboardSidebarNav from "@/components/nav/DashboardSidebarNav";
import adminNavItems from "@/utility/admin-nav-Items";
import SidebarNav from "@/components/common/SidebarNav";

export default function LeftSidebar() {
  return (
    <SidebarNav>
      <BrandNameLogo />
      <DashboardSidebarNav navItems={adminNavItems} />
    </SidebarNav>
  );
}
