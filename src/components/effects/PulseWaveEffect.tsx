"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import { useWindowFocus } from "../../hooks/useWindowFocus";

interface PulseWaveEffectProps {
  opacity?: number;
  speed?: number;
  className?: string;
  waveCount?: number;
}

interface Wave3D {
  radius: number;
  opacity: number;
  speed: number;
  height: number;
  rotationSpeed: number;
  rotationAngle: number;
  distortion: number;
}

export function PulseWaveEffect({
  opacity = 0.3, // Erhöhte Standardopazität für aggressiveren Look
  speed = 1.5,   // Erhöhte Standardgeschwindigkeit für dynamischeren Look
  className = "",
  waveCount = 8, // Mehr Wellen für komplexeren Look
}: PulseWaveEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore((state) => state.isBackgroundAnimationEnabled);
  const { qualityLevel } = useQualitySettingsStore();
  const [isVisible, setIsVisible] = useState(true);
  const isWindowFocused = useWindowFocus();
  
  // Animation timing state management
  const animationStartTimeRef = useRef<number>(0);
  const staticFrameRenderedRef = useRef<boolean>(false);
  const wavesRef = useRef<Wave3D[]>([]);
  const particlesRef = useRef<{x: number; y: number; z: number; speed: number; size: number; opacity: number}[]>([]);
  
  // Animation should only run if both window is focused AND background animations are enabled
  const shouldAnimate = isWindowFocused && isBackgroundAnimationEnabled;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(canvas);

    let animationFrameId: number;
    let lastFrameTime = 0;

    const qualityMultiplier =
      qualityLevel === "low" ? 0.5 : qualityLevel === "high" ? 1.5 : 1.0;
    const adjustedSpeed = speed * qualityMultiplier;
    const adjustedWaveCount = Math.max(4, Math.floor(waveCount * qualityMultiplier));
    const targetFps =
      qualityLevel === "low" ? 24 : qualityLevel === "high" ? 60 : 30;
    const frameInterval = 1000 / targetFps;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    };

    const rgb = hexToRgb(accentColor.value);
    // Komplementärfarbe für dynamischeren Look
    const complementaryRgb = {
      r: 255 - rgb.r,
      g: 255 - rgb.g,
      b: 255 - rgb.b
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    // Initialize waves with 3D properties
    const initWaves = () => {
      const waves: Wave3D[] = [];
      for (let i = 0; i < adjustedWaveCount; i++) {
        waves.push({
          radius: Math.random() * 20, // Größere Startradien
          opacity: (Math.random() * 0.4 + 0.2) * opacity, // Höhere Opazität
          speed: (Math.random() * 0.8 + 0.7) * adjustedSpeed, // Schnellere Geschwindigkeit
          height: Math.random() * 30, // 3D-Höhe für Z-Achsen-Effekt
          rotationSpeed: (Math.random() * 0.02 + 0.01) * adjustedSpeed, // Rotationsgeschwindigkeit
          rotationAngle: Math.random() * Math.PI * 2, // Zufälliger Startwinkel
          distortion: Math.random() * 0.3 + 0.1 // Verzerrungsfaktor für unregelmäßige Formen
        });
      }
      wavesRef.current = waves;
      
      // Initialisiere Partikel für zusätzlichen 3D-Effekt
      if (qualityLevel !== "low") {
        const particleCount = qualityLevel === "high" ? 50 : 25;
        const particles = [];
        for (let i = 0; i < particleCount; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: Math.random() * 200, // Z-Tiefe für 3D-Effekt
            speed: (Math.random() * 0.5 + 0.2) * adjustedSpeed,
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.7 + 0.3
          });
        }
        particlesRef.current = particles;
      }
    };

    const renderWaves = (timestamp: number) => {
      // Initialize animation start time on first run
      if (animationStartTimeRef.current === 0) {
        animationStartTimeRef.current = timestamp;
        lastFrameTime = timestamp;
        initWaves();
      }

      // Don't render if element is not visible
      if (!isVisible) {
        if (shouldAnimate) {
          animationFrameId = requestAnimationFrame(renderWaves);
        }
        return;
      }

      // Throttle frames based on quality settings
      const elapsed = timestamp - lastFrameTime;
      if (elapsed < frameInterval) {
        if (shouldAnimate) {
          animationFrameId = requestAnimationFrame(renderWaves);
        }
        return;
      }

      lastFrameTime = timestamp - (elapsed % frameInterval);
      const effectiveTime = (timestamp - animationStartTimeRef.current) / 1000;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get canvas dimensions in CSS pixels
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Hintergrundeffekt mit dynamischem Farbverlauf
      const bgGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, Math.max(rect.width, rect.height) * 0.7
      );
      
      // Pulsierende Farbintensität
      const pulseIntensity = 0.05 + Math.sin(effectiveTime * 2) * 0.03;
      
      bgGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pulseIntensity * 2 * opacity})`);
      bgGradient.addColorStop(0.3, `rgba(${complementaryRgb.r}, ${complementaryRgb.g}, ${complementaryRgb.b}, ${pulseIntensity * opacity})`);
      bgGradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pulseIntensity * 0.5 * opacity})`);
      bgGradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
      
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Zeichne 3D-Partikel im Hintergrund
      if (qualityLevel !== "low" && particlesRef.current.length > 0) {
        particlesRef.current.forEach((particle, index) => {
          // Bewege Partikel in 3D-Raum
          particle.z -= particle.speed * (elapsed / 16);
          
          // Wenn Partikel zu nah am Betrachter ist, setze ihn zurück
          if (particle.z < 1) {
            particle.z = 200;
            particle.x = Math.random() * rect.width;
            particle.y = Math.random() * rect.height;
          }
          
          // Berechne Größe und Position basierend auf Z-Tiefe (Perspektive)
          const scale = 200 / (200 + particle.z);
          const x = (particle.x - centerX) * scale + centerX;
          const y = (particle.y - centerY) * scale + centerY;
          const size = particle.size * scale;
          
          // Zeichne Partikel mit Tiefeneffekt
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          
          // Wechsle zwischen Akzentfarbe und Komplementärfarbe
          const useComplementary = index % 3 === 0;
          const particleRgb = useComplementary ? complementaryRgb : rgb;
          
          ctx.fillStyle = `rgba(${particleRgb.r}, ${particleRgb.g}, ${particleRgb.b}, ${particle.opacity * scale * opacity})`;
          ctx.fill();
          
          // Glow-Effekt für Partikel
          ctx.shadowBlur = 5 * scale;
          ctx.shadowColor = `rgba(${particleRgb.r}, ${particleRgb.g}, ${particleRgb.b}, ${particle.opacity * 0.5 * opacity})`;
        });
      }
      
      // Zeichne 3D-Wellen mit aggressiveren Effekten
      wavesRef.current.forEach((wave, index) => {
        // Aktualisiere Wellenradius und Rotationswinkel
        wave.radius += wave.speed * (elapsed / 16);
        wave.rotationAngle += wave.rotationSpeed * (elapsed / 16);
        
        // Setze Welle zurück, wenn sie zu groß wird
        if (wave.radius > Math.max(rect.width, rect.height) * 1.2) {
          wave.radius = Math.random() * 20;
          wave.opacity = (Math.random() * 0.4 + 0.2) * opacity;
          wave.speed = (Math.random() * 0.8 + 0.7) * adjustedSpeed;
          wave.height = Math.random() * 30;
          wave.distortion = Math.random() * 0.3 + 0.1;
        }
        
        // Berechne Wellenopazität basierend auf Radius
        const maxDimension = Math.max(rect.width, rect.height);
        const waveOpacity = wave.opacity * (1 - wave.radius / (maxDimension * 1.2));
        
        // Zeichne verzerrte 3D-Welle
        ctx.save();
        ctx.beginPath();
        
        // Verwende Sinus-Wellen für dynamischere Form
        const segments = qualityLevel === "low" ? 12 : qualityLevel === "high" ? 36 : 24;
        const angleStep = (Math.PI * 2) / segments;
        
        for (let i = 0; i <= segments; i++) {
          const segmentAngle = i * angleStep + wave.rotationAngle;
          
          // Berechne verzerrten Radius für 3D-Effekt
          const distortedRadius = wave.radius * (1 + Math.sin(segmentAngle * 3 + effectiveTime * 2) * wave.distortion);
          
          // Berechne 3D-Projektion mit Höhe
          const heightFactor = Math.sin(effectiveTime * 3 + index * 0.5) * wave.height;
          const perspectiveFactor = 1 - Math.min(0.5, distortedRadius / maxDimension);
          
          const x = centerX + Math.cos(segmentAngle) * distortedRadius;
          const y = centerY + Math.sin(segmentAngle) * distortedRadius * perspectiveFactor;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            // Verwende quadratische Kurven für glattere Formen
            const prevAngle = (i - 1) * angleStep + wave.rotationAngle;
            const midAngle = prevAngle + angleStep / 2;
            
            const prevRadius = wave.radius * (1 + Math.sin(prevAngle * 3 + effectiveTime * 2) * wave.distortion);
            const prevX = centerX + Math.cos(prevAngle) * prevRadius;
            const prevY = centerY + Math.sin(prevAngle) * prevRadius * perspectiveFactor;
            
            const midRadius = wave.radius * (1 + Math.sin(midAngle * 3 + effectiveTime * 2) * wave.distortion);
            const midX = centerX + Math.cos(midAngle) * midRadius;
            const midY = centerY + Math.sin(midAngle) * midRadius * perspectiveFactor;
            
            // Verwende quadratische Kurven für glattere Formen
            ctx.quadraticCurveTo(midX, midY, x, y);
          }
        }
        
        // Wechsle zwischen Akzentfarbe und Komplementärfarbe für aggressiveren Look
        const useComplementary = index % 2 === 0;
        const waveRgb = useComplementary ? complementaryRgb : rgb;
        
        // Dynamische Linienbreite für aggressiveren Look
        const pulseWidth = 2 + Math.sin(effectiveTime * 4 + index) * 2;
        ctx.lineWidth = pulseWidth;
        
        // Verwende Farbverläufe für Linien
        const strokeGradient = ctx.createLinearGradient(
          centerX - wave.radius, centerY - wave.radius,
          centerX + wave.radius, centerY + wave.radius
        );
        
        strokeGradient.addColorStop(0, `rgba(${waveRgb.r}, ${waveRgb.g}, ${waveRgb.b}, ${waveOpacity})`);
        strokeGradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${waveOpacity * 1.5})`);
        strokeGradient.addColorStop(1, `rgba(${waveRgb.r}, ${waveRgb.g}, ${waveRgb.b}, ${waveOpacity})`);
        
        ctx.strokeStyle = strokeGradient;
        ctx.stroke();
        
        // Intensiverer Glow-Effekt
        ctx.shadowBlur = 20;
        ctx.shadowColor = `rgba(${waveRgb.r}, ${waveRgb.g}, ${waveRgb.b}, ${waveOpacity * 0.8})`;
        
        // Füge leichte Füllung für mehr Tiefe hinzu
        if (qualityLevel !== "low" && index % 3 === 0) {
          const fillGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, wave.radius
          );
          
          fillGradient.addColorStop(0, `rgba(${waveRgb.r}, ${waveRgb.g}, ${waveRgb.b}, ${waveOpacity * 0.1})`);
          fillGradient.addColorStop(1, `rgba(${waveRgb.r}, ${waveRgb.g}, ${waveRgb.b}, 0)`);
          
          ctx.fillStyle = fillGradient;
          ctx.fill();
        }
        
        ctx.restore();
      });
      
      // Zeichne dynamisches Zentrum mit Energieausbrüchen
      const centerPulse = 8 + Math.sin(effectiveTime * 5) * 4;
      const centerGlow = 20 + Math.sin(effectiveTime * 3) * 10;
      
      // Äußerer Glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerGlow, 0, Math.PI * 2);
      const centerGlowGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, centerGlow
      );
      centerGlowGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.4 * opacity})`);
      centerGlowGradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.2 * opacity})`);
      centerGlowGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      
      ctx.fillStyle = centerGlowGradient;
      ctx.fill();
      
      // Innerer Kern
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerPulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.8 * opacity})`;
      ctx.shadowBlur = 15;
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.8 * opacity})`;
      ctx.fill();
      
      // Energieausbrüche vom Zentrum
      if (qualityLevel !== "low") {
        const burstCount = qualityLevel === "high" ? 8 : 5;
        const burstLength = 30 + Math.sin(effectiveTime * 4) * 15;
        
        for (let i = 0; i < burstCount; i++) {
          const burstAngle = (effectiveTime * 0.5 + i * (Math.PI * 2 / burstCount)) % (Math.PI * 2);
          const endX = centerX + Math.cos(burstAngle) * burstLength;
          const endY = centerY + Math.sin(burstAngle) * burstLength;
          
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(endX, endY);
          
          const burstGradient = ctx.createLinearGradient(centerX, centerY, endX, endY);
          burstGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.8 * opacity})`);
          burstGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
          
          ctx.strokeStyle = burstGradient;
          ctx.lineWidth = 2 + Math.random() * 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.5 * opacity})`;
          ctx.stroke();
        }
      }

      if (shouldAnimate) {
        animationFrameId = requestAnimationFrame(renderWaves);
      } else if (!staticFrameRenderedRef.current) {
        // Render a static frame once when animation is disabled
        staticFrameRenderedRef.current = true;
      }
    };

    resize();
    window.addEventListener("resize", resize);

    // Interaktivität hinzufügen - Mausbewegung beeinflusst die Animation
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Füge Partikel an der Mausposition hinzu, wenn Qualität nicht niedrig ist
      if (qualityLevel !== "low" && particlesRef.current.length > 0 && Math.random() > 0.7) {
        const randomIndex = Math.floor(Math.random() * particlesRef.current.length);
        if (randomIndex < particlesRef.current.length) {
          const particle = particlesRef.current[randomIndex];
          particle.x = mouseX;
          particle.y = mouseY;
          particle.z = 150;
          particle.size = Math.random() * 4 + 2;
          particle.opacity = Math.random() * 0.9 + 0.5;
        }
      }
    };
    
    // Interaktivität hinzufügen - Klick erzeugt Energieausbruch
    const handleClick = (e: MouseEvent) => {
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // Erzeuge neue Wellen vom Klickpunkt aus
      if (wavesRef.current.length > 0) {
        // Setze einige Wellen zurück und platziere sie am Klickpunkt
        const resetCount = Math.min(3, Math.floor(wavesRef.current.length / 3));
        for (let i = 0; i < resetCount; i++) {
          const randomIndex = Math.floor(Math.random() * wavesRef.current.length);
          if (randomIndex < wavesRef.current.length) {
            const wave = wavesRef.current[randomIndex];
            wave.radius = 0;
            wave.opacity = (Math.random() * 0.5 + 0.3) * opacity;
            wave.speed = (Math.random() * 1.0 + 0.8) * adjustedSpeed;
            wave.distortion = Math.random() * 0.4 + 0.2;
          }
        }
      }
    };
    
    // Event-Listener für Interaktivität hinzufügen
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    if (shouldAnimate || !staticFrameRenderedRef.current) {
      animationFrameId = requestAnimationFrame(renderWaves);
    }

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [accentColor.value, isBackgroundAnimationEnabled, isWindowFocused, opacity, qualityLevel, speed, waveCount, isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ opacity: opacity * 2 }}
    />
  );
}