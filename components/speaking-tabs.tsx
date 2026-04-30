"use client";

import {
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@takaki/go-design-system";
import type { ReactNode } from "react";

export function SpeakingTabs({
  todoTab,
  practicedTab,
  todoCount,
  practicedCount,
}: {
  todoTab: ReactNode;
  practicedTab: ReactNode;
  todoCount: number;
  practicedCount: number;
}) {
  return (
    <Tabs defaultValue="todo">
      <TabsList>
        <TabsTrigger value="todo">
          これから
          <Badge variant="secondary" className="ml-2 rounded-full">
            {todoCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="practiced">
          練習した
          <Badge variant="secondary" className="ml-2 rounded-full">
            {practicedCount}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="todo" className="mt-4">
        {todoTab}
      </TabsContent>

      <TabsContent value="practiced" className="mt-4">
        {practicedTab}
      </TabsContent>
    </Tabs>
  );
}
