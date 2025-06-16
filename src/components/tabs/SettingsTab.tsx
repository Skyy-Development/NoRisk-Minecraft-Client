"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from ".././ui/buttons/Button";
import { Card } from ".././ui/Card";
import { ToggleSwitch } from ".././ui/ToggleSwitch";
import { ColorPicker } from ".././ColorPicker";
import type { LauncherConfig } from "../../types/launcherConfig";
import * as ConfigService from "../../services/launcher-config-service";
import { useThemeStore } from "../../store/useThemeStore";
import {
  BACKGROUND_EFFECTS,
  useBackgroundEffectStore,
} from "../../store/background-effect-store";
import {
  type QualityLevel,
  useQualitySettingsStore,
} from "../../store/quality-settings-store";
import { cn } from "../../lib/utils";
import { toast } from "react-hot-toast";
import { TabLayout } from ".././ui/TabLayout";
import EffectPreviewCard from ".././EffectPreviewCard";
import { RangeSlider } from ".././ui/RangeSlider";
import { FullscreenEffectRenderer } from "../FullscreenEffectRenderer";

export function SettingsTab() {
  const [config, setConfig] = useState<LauncherConfig | null>(null);
  const [tempConfig, setTempConfig] = useState<LauncherConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"general" | "appearance" | "advanced">(
    "general",
  );
  const [showFullscreenPreview, setShowFullscreenPreview] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isResettingRef = useRef<boolean>(false);

  const {
    accentColor,
    isBackgroundAnimationEnabled,
    staticBackground,
    toggleStaticBackground,
    toggleBackgroundAnimation,
    isMusicReactivityEnabled,
    toggleMusicReactivity
  } = useThemeStore();
  const { currentEffect, setCurrentEffect } = useBackgroundEffectStore();
  const { qualityLevel, setQualityLevel } = useQualitySettingsStore();

  const backgroundOptions = [
    {
      id: BACKGROUND_EFFECTS.MATRIX_RAIN,
      name: "Matrix Rain",
      icon: "solar:code-bold",
    },
    {
      id: BACKGROUND_EFFECTS.ENCHANTMENT_PARTICLES,
      name: "Enchantment Table",
      icon: "solar:magic-stick-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_WAVES,
      name: "Nebula Waves",
      icon: "solar:soundwave-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_PARTICLES,
      name: "Nebula Particles",
      icon: "solar:star-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_GRID,
      name: "Nebula Grid",
      icon: "solar:widget-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_VOXELS,
      name: "Nebula Voxels",
      icon: "solar:asteroid-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_LIGHTNING,
      name: "Nebula Lightning",
      icon: "solar:bolt-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_LIQUID_CHROME,
      name: "Liquid Chrome",
      icon: "solar:cloud-waterdrops-bold",
    },
    {
      id: BACKGROUND_EFFECTS.RETRO_GRID,
      name: "Retro Grid",
      icon: "solar:widget-5-bold",
    },
    {
      id: BACKGROUND_EFFECTS.PLAIN_BACKGROUND,
      name: "Plain Color",
      icon: "solar:palette-bold",
    },
    {
      id: BACKGROUND_EFFECTS.STARFIELD,
      name: "Starfield",
      icon: "solar:stars-minimalistic-bold",
    },
    {
      id: BACKGROUND_EFFECTS.FIREFLIES,
      name: "Fireflies",
      icon: "solar:bug-minimalistic-bold",
    },
    {
      id: BACKGROUND_EFFECTS.PULSE_WAVE,
      name: "Pulse Wave",
      icon: "solar:wave-square-bold",
    },
  ];

  const qualityOptions: { value: QualityLevel; label: string; icon: string }[] =
    [
      {
        value: "low",
        label: "Low",
        icon: "solar:battery-half-bold",
      },
      {
        value: "medium",
        label: "Medium",
        icon: "solar:battery-full-bold",
      },
      { value: "high", label: "High", icon: "solar:battery-charge-bold" },
    ];

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedConfig = await ConfigService.getLauncherConfig();
      // Ensure hooks object exists with default values
      const configWithHooks = {
        ...loadedConfig,
        hooks: loadedConfig.hooks || {
          pre_launch: null,
          wrapper: null,
          post_exit: null,
        },
      };
      setConfig(configWithHooks);
      setTempConfig({ ...configWithHooks });
      console.log("Loaded launcher config:", configWithHooks);
    } catch (err) {
      console.error("Failed to load launcher config:", err);
      setError(err instanceof Error ? err.message : String(err));
      setConfig(null);
      setTempConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const autoSaveConfig = useCallback(async (configToSave: LauncherConfig) => {
    if (isResettingRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const updatedConfig =
          await ConfigService.setLauncherConfig(configToSave);
        setConfig(updatedConfig);
        console.log("Configuration auto-saved successfully:", updatedConfig);
        toast.success("Settings auto-saved!", {
          duration: 2000,
          position: "bottom-right",
        });
      } catch (err) {
        console.error("Failed to auto-save configuration:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error(`Auto-save failed: ${errorMessage}`);
      } finally {
        setSaving(false);
      }
    }, 500); // Added a delay to prevent rapid saving
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (
      tempConfig &&
      config &&
      JSON.stringify(config) !== JSON.stringify(tempConfig)
    ) {
      autoSaveConfig(tempConfig);
    }
  }, [tempConfig, config, autoSaveConfig]);

  // Update local state without saving
  const handleConcurrentDownloadsChange = (value: number) => {
    if (tempConfig) {
      setTempConfig({ ...tempConfig, concurrent_downloads: value });
    }
  };

  const handleConcurrentIoLimitChange = (value: number) => {
    if (tempConfig) {
      setTempConfig({ ...tempConfig, concurrent_io_limit: value });
    }
  };

  const resetChanges = () => {
    if (config) {
      isResettingRef.current = true;
      setTempConfig({ ...config });
      setError(null);
      toast.success("Settings reset to saved values");

      setTimeout(() => {
        isResettingRef.current = false;
      }, 100);
    }
  };

  const hasChanges =
    config &&
    tempConfig &&
    JSON.stringify(config) !== JSON.stringify(tempConfig);

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <Card variant="flat" className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:settings-bold" className="w-6 h-6 text-white" />
            <h3 className="text-3xl font-minecraft text-white lowercase">
              Launcher Settings
            </h3>
          </div>
          <p className="text-base text-white/70 font-minecraft-ten mt-2">
            Configure basic launcher settings
          </p>
        </div>

        <div className="space-y-4 mt-6">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex-1">
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Experimental Mode
              </h5>
              <p className="text-sm text-white/60 font-minecraft-ten mt-1">
                Enable experimental features and unstable functionality. May
                cause crashes or unexpected behavior.
              </p>
            </div>
            <ToggleSwitch
              checked={tempConfig?.is_experimental || false}
              onChange={(newCheckedState) => {
                if (tempConfig) {
                  setTempConfig({
                    ...tempConfig,
                    is_experimental: newCheckedState,
                  });
                }
              }}
              disabled={saving}
              size="lg"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex-1">
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Auto Updates
              </h5>
              <p className="text-sm text-white/60 font-minecraft-ten mt-1">
                Automatically check for and download launcher updates when
                available.
              </p>
            </div>
            <ToggleSwitch
              checked={tempConfig?.auto_check_updates || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({ ...tempConfig, auto_check_updates: checked })
              }
              disabled={saving}
              size="lg"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex-1">
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Discord Presence
              </h5>
              <p className="text-sm text-white/60 font-minecraft-ten mt-1">
                Show your current game and launcher status in Discord. Displays
                what you're playing to friends.
              </p>
            </div>
            <ToggleSwitch
              checked={tempConfig?.enable_discord_presence || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({
                  ...tempConfig,
                  enable_discord_presence: checked,
                })
              }
              disabled={saving}
              size="lg"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex-1">
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Beta Updates
              </h5>
              <p className="text-sm text-white/60 font-minecraft-ten mt-1">
                Receive beta versions and pre-release updates. These may be
                unstable and contain bugs.
              </p>
            </div>
            <ToggleSwitch
              checked={tempConfig?.check_beta_channel || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({ ...tempConfig, check_beta_channel: checked })
              }
              disabled={saving}
              size="lg"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex-1">
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Open Logs After Starting
              </h5>
              <p className="text-sm text-white/60 font-minecraft-ten mt-1">
                Automatically open the game logs window when launching
                Minecraft. Useful for debugging issues.
              </p>
            </div>
            <ToggleSwitch
              checked={tempConfig?.open_logs_after_starting || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({
                  ...tempConfig,
                  open_logs_after_starting: checked,
                })
              }
              disabled={saving}
              size="lg"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex-1">
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Hide Window on Launch
              </h5>
              <p className="text-sm text-white/60 font-minecraft-ten mt-1">
                Automatically hide the launcher window when Minecraft starts.
                Reduces desktop clutter during gameplay.
              </p>
            </div>
            <ToggleSwitch
              checked={tempConfig?.hide_on_process_start || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({
                  ...tempConfig,
                  hide_on_process_start: checked,
                })
              }
              disabled={saving}
              size="lg"
            />
          </div>

          <div className="p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex-1 mb-3">
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Concurrent Downloads
              </h5>
              <p className="text-sm text-white/60 font-minecraft-ten mt-1">
                Maximum number of files downloaded simultaneously. Lower values
                reduce bandwidth usage but slow downloads.
              </p>
            </div>
            <div className="w-full px-2">
              <RangeSlider
                value={tempConfig.concurrent_downloads || 3}
                onChange={handleConcurrentDownloadsChange}
                min={1}
                max={10}
                step={1}
                disabled={saving}
                variant="flat"
                size="md"
                minLabel="1"
                maxLabel="10"
                icon={
                  <Icon
                    icon="solar:multiple-forward-right-bold"
                    className="w-4 h-4"
                  />
                }
              />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex-1 mb-3">
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Concurrent I/O Operations
              </h5>
              <p className="text-sm text-white/60 font-minecraft-ten mt-1">
                Maximum number of files written to disk simultaneously. Lower
                values reduce disk stress and I/O errors.
              </p>
            </div>
            <div className="w-full px-2">
              <RangeSlider
                value={tempConfig.concurrent_io_limit || 10}
                onChange={handleConcurrentIoLimitChange}
                min={1}
                max={20}
                step={1}
                disabled={saving}
                variant="flat"
                size="md"
                minLabel="1"
                maxLabel="20"
                icon={<Icon icon="solar:server-bold" className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <Card variant="flat" className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:palette-bold" className="w-6 h-6 text-white" />
            <h3 className="text-3xl font-minecraft text-white lowercase">
              Accent Color
            </h3>
          </div>
          <p className="text-base text-white/70 font-minecraft-ten mt-2">
            Choose your preferred accent color for the launcher
          </p>
        </div>

        <div className="mt-6">
          <ColorPicker shape="square" size="md" showCustomOption={false} />
        </div>

        <div className="mt-6 p-4 rounded-lg border border-[#ffffff20]">
          <div className="flex items-center gap-2 mb-3">
            <Icon icon="solar:eye-bold" className="w-5 h-5 text-white" />
            <h4 className="text-2xl font-minecraft text-white lowercase">
              Preview
            </h4>
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            <Button
              icon={<Icon icon="solar:play-bold" />}
              size="md"
              variant="flat"
            >
              Play Game
            </Button>
            <Button
              variant="flat-secondary"
              icon={<Icon icon="solar:settings-bold" />}
              size="md"
            >
              Settings
            </Button>
            <Button
              variant="ghost"
              icon={<Icon icon="solar:download-bold" />}
              size="md"
            >
              Download
            </Button>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg border border-[#ffffff20] bg-black/10">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:lock-bold" className="w-5 h-5 text-white/50" />
            <h4 className="text-xl font-minecraft text-white/50 lowercase">
              Custom Colors
            </h4>
          </div>
          <p className="text-sm text-white/40 font-minecraft-ten">
            Custom color selection is currently disabled
          </p>
        </div>
      </Card>

      <Card variant="flat" className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon
              icon="solar:speedometer-medium-bold"
              className="w-6 h-6 text-white"
            />
            <h3 className="text-3xl font-minecraft text-white lowercase">
              Visual Quality
            </h3>
          </div>
          <p className="text-base text-white/70 font-minecraft-ten mt-2">
            Adjust visual quality for all effects
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          {qualityOptions.map((option) => (
            <Card
              key={option.value}
              variant="flat"
              className={cn(
                "relative cursor-pointer transition-all duration-300 p-4",
                qualityLevel === option.value
                  ? "ring-2 ring-white/30"
                  : "hover:bg-black/40",
              )}
              onClick={() => setQualityLevel(option.value)}
            >
              <div className="flex flex-col items-center gap-2">
                <Icon icon={option.icon} className="w-8 h-8 text-white" />
                <h5 className="font-minecraft text-xl lowercase text-white text-center">
                  {option.label}
                </h5>
              </div>
              {qualityLevel === option.value && (
                <div className="absolute top-2 right-2">
                  <Icon
                    icon="solar:check-circle-bold"
                    className="w-5 h-5"
                    style={{ color: accentColor.value }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg border border-[#ffffff20]">
          <p className="text-sm text-white/70 font-minecraft-ten">
            {qualityLevel === "low" &&
              "Low quality reduces particle count and detail for better performance."}
            {qualityLevel === "medium" &&
              "Medium quality provides a balanced experience for most systems."}
            {qualityLevel === "high" &&
              "High quality increases visual fidelity but may impact performance on older systems."}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
          <div className="flex-1">
            <h5 className="font-minecraft text-2xl lowercase text-white">
              Background Animations
            </h5>
            <p className="text-sm text-white/60 font-minecraft-ten mt-1">
              Enable or disable animated background effects. Disabling improves
              performance on slower systems.
            </p>
          </div>
          <ToggleSwitch
            checked={!staticBackground}
            onChange={() => {
              toggleStaticBackground();
              toggleBackgroundAnimation();
            }}
            disabled={saving}
            size="lg"
          />
        </div>
        
        <div className="mt-4 flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
          <div className="flex-1">
            <h5 className="font-minecraft text-2xl lowercase text-white">
              Music Reactivity
            </h5>
            <p className="text-sm text-white/60 font-minecraft-ten mt-1">
              Make background animations react to music. Requires microphone access.
            </p>
          </div>
          <ToggleSwitch
            checked={isMusicReactivityEnabled}
            onChange={toggleMusicReactivity}
            disabled={saving || staticBackground}
            size="lg"
          />
        </div>

      </Card>

      <Card variant="flat" className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:stars-bold" className="w-6 h-6 text-white" />
            <h3 className="text-3xl font-minecraft text-white lowercase">
              Background Effect
            </h3>
          </div>
          <p className="text-base text-white/70 font-minecraft-ten mt-2">
            Choose a background effect for the launcher
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {backgroundOptions.map((option) => (
            <EffectPreviewCard
              key={option.id}
              effectId={option.id}
              name={option.name}
              icon={option.icon}
              isActive={currentEffect === option.id}
              onClick={() => setCurrentEffect(option.id)}
            />
          ))}
        </div>
        {currentEffect !== BACKGROUND_EFFECTS.PLAIN_BACKGROUND && (
          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => setShowFullscreenPreview(true)}
              variant="flat"
              size="md"
              icon={<Icon icon="solar:eye-scan-bold" className="w-5 h-5" />}
            >
              Preview Fullscreen
            </Button>
          </div>
        )}
      </Card>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-6">
      <Card variant="flat" className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:code-bold" className="w-6 h-6 text-white" />
            <h3 className="text-3xl font-minecraft text-white lowercase">
              Game Hooks
            </h3>
          </div>
          <p className="text-base text-white/70 font-minecraft-ten mt-2">
            Configure custom commands to run before, during, and after game launch
          </p>
        </div>

        <div className="space-y-6 mt-6">
          <div className="p-4 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="solar:play-circle-bold" className="w-5 h-5 text-white" />
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Pre-Launch Hook
              </h5>
            </div>
            <p className="text-sm text-white/60 font-minecraft-ten mb-4">
              Command to run before Minecraft starts. If this command fails, the launch will be aborted.
            </p>
            <input
              type="text"
              value={tempConfig?.hooks?.pre_launch || ""}
              onChange={(e) => {
                if (tempConfig) {
                  setTempConfig({
                    ...tempConfig,
                    hooks: {
                      ...tempConfig.hooks,
                      pre_launch: e.target.value || null,
                    },
                  });
                }
              }}
              placeholder='Example: echo "Starting Minecraft..."'
              className="w-full p-3 rounded-md bg-black/40 border border-[#ffffff20] text-white placeholder-white/40 font-minecraft-ten focus:outline-none focus:ring-2 focus:ring-white/30"
              disabled={saving}
            />
          </div>

          <div className="p-4 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="solar:shield-bold" className="w-5 h-5 text-white" />
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Wrapper Hook
              </h5>
            </div>
            <p className="text-sm text-white/60 font-minecraft-ten mb-4">
              Wrapper command to run Java through (e.g., sandboxing tools). The Java path will be passed as an argument.
            </p>
            <input
              type="text"
              value={tempConfig?.hooks?.wrapper || ""}
              onChange={(e) => {
                if (tempConfig) {
                  setTempConfig({
                    ...tempConfig,
                    hooks: {
                      ...tempConfig.hooks,
                      wrapper: e.target.value || null,
                    },
                  });
                }
              }}
              placeholder="Example: firejail or gamemoderun"
              className="w-full p-3 rounded-md bg-black/40 border border-[#ffffff20] text-white placeholder-white/40 font-minecraft-ten focus:outline-none focus:ring-2 focus:ring-white/30"
              disabled={saving}
            />
          </div>

          <div className="p-4 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="solar:stop-circle-bold" className="w-5 h-5 text-white" />
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Post-Exit Hook
              </h5>
            </div>
            <p className="text-sm text-white/60 font-minecraft-ten mb-4">
              Command to run after Minecraft exits successfully. Runs in the background without blocking.
            </p>
            <input
              type="text"
              value={tempConfig?.hooks?.post_exit || ""}
              onChange={(e) => {
                if (tempConfig) {
                  setTempConfig({
                    ...tempConfig,
                    hooks: {
                      ...tempConfig.hooks,
                      post_exit: e.target.value || null,
                    },
                  });
                }
              }}
              placeholder='Example: echo "Minecraft closed"'
              className="w-full p-3 rounded-md bg-black/40 border border-[#ffffff20] text-white placeholder-white/40 font-minecraft-ten focus:outline-none focus:ring-2 focus:ring-white/30"
              disabled={saving}
            />
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg border border-orange-500/30 bg-orange-900/20">
          <div className="flex items-start gap-3">
            <Icon icon="solar:danger-triangle-bold" className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-xl font-minecraft text-orange-300 mb-2 lowercase">
                Warning
              </h4>
              <p className="text-sm text-orange-200/80 font-minecraft-ten">
                These hooks execute system commands with full permissions. Only use commands you trust and understand.
                Invalid commands may prevent Minecraft from launching or cause security issues.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg border border-[#ffffff20] bg-black/10">
          <div className="flex items-start gap-3">
            <Icon icon="solar:info-circle-bold" className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-xl font-minecraft text-blue-300 mb-2 lowercase">
                Examples
              </h4>
              <div className="space-y-2 text-sm text-blue-200/80 font-minecraft-ten">
                <p><strong>Pre-Launch:</strong> <code>echo "Starting game..."</code></p>
                <p><strong>Wrapper:</strong> <code>firejail</code> or <code>gamemoderun</code></p>
                <p><strong>Post-Exit:</strong> <code>notify-send "Game finished"</code></p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icon
              icon="solar:refresh-bold"
              className="w-10 h-10 text-white/70 animate-spin mx-auto mb-4"
            />
            <p className="text-2xl text-white/70 font-minecraft">
              Loading Settings...
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-900/30 border-2 border-red-700/50 rounded-lg p-6 my-4">
          <div className="flex items-start gap-3">
            <Icon
              icon="solar:danger-triangle-bold"
              className="w-8 h-8 text-red-400 flex-shrink-0 mt-1"
            />
            <div>
              <h3 className="text-2xl text-red-300 font-minecraft mb-2">
                Error Loading Settings
              </h3>
              <p className="text-xl text-red-200/80 font-minecraft mb-4">
                {error}
              </p>
              <Button
                onClick={loadConfig}
                variant="secondary"
                size="sm"
                icon={<Icon icon="solar:refresh-bold" className="w-5 h-5" />}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (!config || !tempConfig) {
      return (
        <div className="text-center p-8">
          <p className="text-2xl text-white/70 font-minecraft">
            Could not load configuration.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "general":
        return renderGeneralTab();
      case "appearance":
        return renderAppearanceTab();
      case "advanced":
        return renderAdvancedTab();
      default:
        return null;
    }
  };

  const settingsActions = <div className="flex items-center gap-3"></div>;

  return (
    <div ref={tabRef} className="flex flex-col h-full overflow-hidden">
      <TabLayout
        title="Settings"
        icon="solar:settings-bold"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant={activeTab === "general" ? "flat" : "ghost"}
              size="md"
              onClick={() => setActiveTab("general")}
              className="h-[42px]"
              icon={
                <Icon
                  icon="solar:settings-bold"
                  className="w-5 h-5 text-white"
                />
              }
            >
              general
            </Button>
            <Button
              variant={activeTab === "appearance" ? "flat" : "ghost"}
              size="md"
              onClick={() => setActiveTab("appearance")}
              className="h-[42px]"
              icon={
                <Icon
                  icon="solar:palette-bold"
                  className="w-5 h-5 text-white"
                />
              }
            >
              appearance
            </Button>
            <Button
              variant={activeTab === "advanced" ? "flat" : "ghost"}
              size="md"
              onClick={() => setActiveTab("advanced")}
              className="h-[42px]"
              icon={
                <Icon
                  icon="solar:code-bold"
                  className="w-5 h-5 text-white"
                />
              }
            >
              advanced
            </Button>
            {settingsActions}
          </div>
        }
      >
        <div ref={contentRef}>{renderTabContent()}</div>
      </TabLayout>
      {showFullscreenPreview && currentEffect && (
        <FullscreenEffectRenderer 
          effectId={currentEffect} 
          onClose={() => setShowFullscreenPreview(false)} 
        />
      )}
    </div>
  );
}
