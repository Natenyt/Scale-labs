"use client";

import { PlusIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AgentsFilter = {
  query: string;
  language: "all" | "en" | "ru" | "uz";
  status: "all" | "draft" | "live";
};

type Props = {
  filter: AgentsFilter;
  onFilterChange: (next: AgentsFilter) => void;
  onCreate: () => void;
  showCreate?: boolean;
};

export function AgentsToolbar({
  filter,
  onFilterChange,
  onCreate,
  showCreate = true,
}: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-sm">
        <SearchIcon className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
        <Input
          placeholder="Search agents…"
          value={filter.query}
          onChange={(e) => onFilterChange({ ...filter, query: e.target.value })}
          className="bg-card/50 h-9 pl-8 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={filter.language}
          onValueChange={(v) =>
            onFilterChange({ ...filter, language: v as AgentsFilter["language"] })
          }
        >
          <SelectTrigger className="h-9 w-[140px] bg-card/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ru">Russian</SelectItem>
            <SelectItem value="uz">Uzbek</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filter.status}
          onValueChange={(v) =>
            onFilterChange({ ...filter, status: v as AgentsFilter["status"] })
          }
        >
          <SelectTrigger className="h-9 w-[120px] bg-card/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        {showCreate ? (
          <Button onClick={onCreate} className="h-9">
            <PlusIcon className="size-3.5" />
            New agent
          </Button>
        ) : null}
      </div>
    </div>
  );
}
