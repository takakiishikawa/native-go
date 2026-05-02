"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@takaki/go-design-system";
import { NativeGoSidebar } from "./native-go-sidebar";
import { HeaderBreadcrumb } from "./header-breadcrumb";

export function NativeGoShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <NativeGoSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <HeaderBreadcrumb />
        </header>
        <main className="@container/main flex flex-1 flex-col gap-4 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
