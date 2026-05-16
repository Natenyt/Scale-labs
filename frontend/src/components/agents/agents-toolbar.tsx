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
};

export function AgentsToolbar({ filter, onFilterChange, onCreate }: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="text-muted-foreground text-sm">
          Voice agents that talk to your customers, anchored to your CRM.
        </p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search agents..."
            value={filter.query}
            onChange={(e) =>
              onFilterChange({ ...filter, query: e.target.value })
            }
            className="pl-8 md:w-56"
          />
        </div>
        <Select
          value={filter.language}
          onValueChange={(v) =>
            onFilterChange({ ...filter, language: v as AgentsFilter["language"] })
          }
        >
          <SelectTrigger className="md:w-36">
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
          <SelectTrigger className="md:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onCreate}>
          <PlusIcon className="size-4" />
          New agent
        </Button>
      </div>
    </div>
  );
}
