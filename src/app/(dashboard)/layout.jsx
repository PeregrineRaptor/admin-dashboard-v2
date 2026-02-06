import Content from "@/components/common/Content";

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children, sidebar, app_bar }) {
  return (
    <>
      {sidebar}
      {app_bar}
      <Content>{children}</Content>
    </>
  );
}
