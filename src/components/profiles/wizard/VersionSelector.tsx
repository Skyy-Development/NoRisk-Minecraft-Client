"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../../store/useThemeStore";
import { SearchInput } from "../../ui/SearchInput";
import { Card } from "../../ui/Card";
import { gsap } from "gsap";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/buttons/Button";
import { Icon } from "@iconify/react";

type VersionType = "release" | "snapshot" | "old-beta" | "old-alpha";
type FilterOption = "all" | "major" | "minor" | "latest";

interface VersionSelectorProps {
  selectedVersion: string;
  onVersionSelect: (version: string) => void;
  selectedVersionType: VersionType;
  onVersionTypeSelect: (type: VersionType) => void;
  versions: string[];
}

export function VersionSelector({
  selectedVersion,
  onVersionSelect,
  selectedVersionType,
  onVersionTypeSelect,
  versions,
}: VersionSelectorProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const typeButtonsRef = useRef<HTMLDivElement>(null);
  const versionsGridRef = useRef<HTMLDivElement>(null);
  const filterButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isBackgroundAnimationEnabled && typeButtonsRef.current) {
      gsap.fromTo(
        typeButtonsRef.current.children,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: "power2.out",
        },
      );
    }
  }, [isBackgroundAnimationEnabled]);

  useEffect(() => {
    if (isBackgroundAnimationEnabled && filterButtonsRef.current) {
      gsap.fromTo(
        filterButtonsRef.current.children,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: "power2.out",
        },
      );
    }
  }, [isBackgroundAnimationEnabled]);

  useEffect(() => {
    if (isBackgroundAnimationEnabled && versionsGridRef.current) {
      gsap.fromTo(
        versionsGridRef.current,
        { opacity: 0.5, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
        },
      );
    }
  }, [selectedVersionType, searchQuery, filterOption, isBackgroundAnimationEnabled]);

  // Parse version string into components
  const parseVersion = (version: string) => {
    const parts = version.split(".");
    return {
      major: parseInt(parts[0]) || 0,
      minor: parseInt(parts[1]) || 0,
      patch: parseInt(parts[2]) || 0,
    };
  };

  // Apply filters to versions
  const filteredVersions = versions.filter((version) => {
    // First apply search filter
    if (searchQuery && !version.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Then apply version filter
    if (filterOption !== "all") {
      const parsedVersion = parseVersion(version);
      
      if (filterOption === "latest") {
        // Get the highest major version
        const highestMajor = Math.max(...versions.map(v => parseVersion(v).major));
        // Only show versions with the highest major version
        return parsedVersion.major === highestMajor;
      }
      
      if (filterOption === "major") {
        // Group by major version and only show the latest of each major version
        const majorVersions = versions
          .map(parseVersion)
          .filter(v => v.major === parsedVersion.major);
        
        const highestMinor = Math.max(...majorVersions.map(v => v.minor));
        const highestPatch = Math.max(
          ...majorVersions
            .filter(v => v.minor === highestMinor)
            .map(v => v.patch)
        );
        
        return (
          parsedVersion.major === parsedVersion.major &&
          parsedVersion.minor === highestMinor &&
          parsedVersion.patch === highestPatch
        );
      }
      
      if (filterOption === "minor") {
        // Group by minor version and only show the latest patch of each minor version
        const minorVersions = versions
          .map(parseVersion)
          .filter(
            v => v.major === parsedVersion.major && v.minor === parsedVersion.minor
          );
        
        const highestPatch = Math.max(...minorVersions.map(v => v.patch));
        
        return (
          parsedVersion.major === parsedVersion.major &&
          parsedVersion.minor === parsedVersion.minor &&
          parsedVersion.patch === highestPatch
        );
      }
    }
    
    return true;
  });

  return (
    <div className="space-y-6 select-none">
      <div className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            version type
          </h3>
          <div ref={typeButtonsRef} className="flex flex-wrap gap-2">
            {
              [
                { id: "release", label: "release" },
                { id: "snapshot", label: "snapshot" },
                { id: "old-beta", label: "old beta" },
                { id: "old-alpha", label: "old alpha" },
              ].map((type) => (
                <Button
                  key={type.id}
                  variant={
                    selectedVersionType === type.id ? "default" : "secondary"
                  }
                  size="md"
                  className={cn(
                    "text-xl",
                    selectedVersionType === type.id &&
                      "border-b-[3px] border-b-accent",
                  )}
                  onClick={() => onVersionTypeSelect(type.id as VersionType)}
                >
                  {type.label}
                </Button>
              ))
            }
          </div>
        </div>

        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            game version
          </h3>
          <div className="mb-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="search versions..."
              className="w-full text-2xl py-3"
            />
          </div>

          <div className="mb-3">
            <h4 className="text-xl font-minecraft text-white mb-2 lowercase">
              filter options
            </h4>
            <div ref={filterButtonsRef} className="flex flex-wrap gap-2">
              {
                [
                  { id: "all", label: "all versions", icon: "solar:list-bold" },
                  { id: "latest", label: "latest major", icon: "solar:star-bold" },
                  { id: "major", label: "latest in major", icon: "solar:sort-by-time-bold" },
                  { id: "minor", label: "latest in minor", icon: "solar:filter-bold" },
                ].map((filter) => (
                  <Button
                    key={filter.id}
                    variant={
                      filterOption === filter.id ? "default" : "secondary"
                    }
                    size="sm"
                    className={cn(
                      "text-sm flex items-center gap-1",
                      filterOption === filter.id &&
                        "border-b-[3px] border-b-accent",
                    )}
                    onClick={() => setFilterOption(filter.id as FilterOption)}
                  >
                    <Icon icon={filter.icon} className="w-4 h-4" />
                    {filter.label}
                  </Button>
                ))
              }
            </div>
          </div>

          <div className="flex-1 relative">
            <Card
              variant="flat"
              className="max-h-48 overflow-y-auto custom-scrollbar bg-black/20 border border-white/10"
            >
              {filteredVersions.length === 0 ? (
                <div className="p-4 text-2xl text-white/70 text-center select-none">
                  no versions found matching your filters
                </div>
              ) : (
                <div
                  ref={versionsGridRef}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3"
                >
                  {filteredVersions.map((version) => (
                    <VersionButton
                      key={version}
                      version={version}
                      isSelected={selectedVersion === version}
                      onClick={() => onVersionSelect(version)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VersionButtonProps {
  version: string;
  isSelected: boolean;
  onClick: () => void;
}

function VersionButton({ version, isSelected, onClick }: VersionButtonProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (buttonRef.current && isSelected && isBackgroundAnimationEnabled) {
      gsap.fromTo(
        buttonRef.current,
        { scale: 0.95 },
        {
          scale: 1,
          duration: 0.3,
          ease: "elastic.out(1.2, 0.4)",
        },
      );
    }
  }, [isSelected, isBackgroundAnimationEnabled]);

  return (
    <Button
      ref={buttonRef}
      variant={isSelected ? "default" : "ghost"}
      onClick={onClick}
      size="sm"
    >
      {version}
    </Button>
  );
}
