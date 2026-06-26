"use client";

import { useEffect, useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectSummary {
  name: string;
}

interface ProjectSwitcherProps {
  currentProject: string;
  onSwitch: (name: string) => void;
}

/**
 * Dropdown for switching between saved diagrams, plus an inline form for
 * creating a new (empty) one.
 * @param props The active project name and a switch callback.
 * @returns The rendered switcher.
 */
export function ProjectSwitcher({ currentProject, onSwitch }: ProjectSwitcherProps): React.JSX.Element {
  const [projects, setProjects] = useState<ProjectSummary[]>([{ name: currentProject }]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async (): Promise<ProjectSummary[]> => {
    const res = await fetch("/api/diagrams");
    return (await res.json()) as ProjectSummary[];
  };

  const refresh = async (): Promise<ProjectSummary[]> => {
    const list = await fetchProjects();
    const withCurrent = list.some((p) => p.name === currentProject)
      ? list
      : [{ name: currentProject }, ...list];
    setProjects(withCurrent);
    return withCurrent;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const list = await fetchProjects();
      if (cancelled) return;
      const withCurrent = list.some((p) => p.name === currentProject)
        ? list
        : [{ name: currentProject }, ...list];
      setProjects(withCurrent);
    };
    void load();
    return (): void => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (): Promise<void> => {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/diagrams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Could not create project");
      return;
    }
    setError(null);
    setNewName("");
    setCreating(false);
    await refresh();
    onSwitch(name);
  };

  if (creating) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          placeholder="Project name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreate();
            if (e.key === "Escape") setCreating(false);
          }}
          className="h-7 w-36 text-xs"
        />
        <Button size="sm" onClick={() => void handleCreate()}>
          Create
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
          Cancel
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={currentProject} onValueChange={onSwitch}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.name} value={p.name}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="icon-sm" variant="ghost" title="New project" onClick={() => setCreating(true)}>
        <FolderPlus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
