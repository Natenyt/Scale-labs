import { AgentsProvider } from "@/components/agents/agents-store";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { IntegrationsProvider } from "@/components/integrations/integrations-store";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { WorkflowsProvider } from "@/components/workflows/workflows-store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <IntegrationsProvider>
        <WorkflowsProvider>
          <AgentsProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                  />
                  <PageBreadcrumb />
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
            </SidebarInset>
          </SidebarProvider>
          <Toaster richColors position="bottom-right" />
          </AgentsProvider>
        </WorkflowsProvider>
      </IntegrationsProvider>
    </AuthGuard>
  );
}
