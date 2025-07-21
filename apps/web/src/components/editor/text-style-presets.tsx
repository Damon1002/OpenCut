"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TextElement, TimelineTrack } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { useProjectStore } from "@/stores/project-store";
import { toast } from "sonner";
import { Type, Palette } from "lucide-react";

interface TextStylePresetsProps {
  element: TextElement;
  track: TimelineTrack;
}

// Text style presets similar to CapCut
const TEXT_STYLE_PRESETS = [
  {
    id: "bold-white",
    name: "Bold White",
    preview: "Aa",
    style: {
      fontSize: 64,
      fontWeight: "bold",
      color: "#ffffff",
      textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
      backgroundColor: "transparent",
    },
    bgColor: "#333",
    textColor: "#ffffff"
  },
  {
    id: "elegant-black",
    name: "Elegant Black",
    preview: "Aa",
    style: {
      fontSize: 48,
      fontWeight: "500",
      color: "#000000",
      backgroundColor: "transparent",
    },
    bgColor: "#f5f5f5",
    textColor: "#000000"
  },
  {
    id: "neon-green",
    name: "Neon Green",
    preview: "Aa",
    style: {
      fontSize: 52,
      fontWeight: "bold",
      color: "#00ff00",
      textShadow: "0 0 20px #00ff00, 0 0 40px #00ff00",
      backgroundColor: "transparent",
    },
    bgColor: "#000",
    textColor: "#00ff00"
  },
  {
    id: "gold-luxury",
    name: "Gold Luxury",
    preview: "Aa",
    style: {
      fontSize: 56,
      fontWeight: "bold",
      color: "#ffd700",
      textShadow: "2px 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px #ffd700",
      backgroundColor: "transparent",
    },
    bgColor: "#1a1a1a",
    textColor: "#ffd700"
  },
  {
    id: "red-alert",
    name: "Red Alert",
    preview: "Aa",
    style: {
      fontSize: 48,
      fontWeight: "bold",
      color: "#ffffff",
      textShadow: "0 0 15px #dc143c",
      backgroundColor: "#dc143c",
    },
    bgColor: "#dc143c",
    textColor: "#ffffff"
  },
  {
    id: "sky-blue",
    name: "Sky Blue",
    preview: "Aa",
    style: {
      fontSize: 46,
      fontWeight: "600",
      color: "#ffffff",
      textShadow: "0 0 10px #1e90ff",
      backgroundColor: "#1e90ff",
    },
    bgColor: "#1e90ff",
    textColor: "#ffffff"
  },
  {
    id: "orange-burst",
    name: "Orange Burst",
    preview: "Aa",
    style: {
      fontSize: 50,
      fontWeight: "bold",
      color: "#ffffff",
      textShadow: "0 0 12px #ff4500",
      backgroundColor: "#ff7f00",
    },
    bgColor: "#ff7f00",
    textColor: "#ffffff"
  },
  {
    id: "purple-magic",
    name: "Purple Magic",
    preview: "Aa",
    style: {
      fontSize: 48,
      fontWeight: "600",
      color: "#ffffff",
      textShadow: "0 0 10px #8a2be2",
      backgroundColor: "#8a2be2",
    },
    bgColor: "#8a2be2",
    textColor: "#ffffff"
  },
  {
    id: "neon-pink",
    name: "Neon Pink",
    preview: "Aa",
    style: {
      fontSize: 54,
      fontWeight: "bold",
      color: "#ff1493",
      textShadow: "0 0 20px #ff1493, 0 0 40px #ff1493",
      backgroundColor: "transparent",
    },
    bgColor: "#000",
    textColor: "#ff1493"
  },
  {
    id: "electric-blue",
    name: "Electric Blue",
    preview: "Aa",
    style: {
      fontSize: 52,
      fontWeight: "bold",
      color: "#00bfff",
      textShadow: "0 0 15px #00bfff, 0 0 30px #00bfff",
      backgroundColor: "transparent",
    },
    bgColor: "#001a33",
    textColor: "#00bfff"
  },
  {
    id: "mint-fresh",
    name: "Mint Fresh",
    preview: "Aa",
    style: {
      fontSize: 44,
      fontWeight: "500",
      color: "#ffffff",
      textShadow: "1px 1px 3px rgba(0, 0, 0, 0.5)",
      backgroundColor: "#00fa9a",
    },
    bgColor: "#00fa9a",
    textColor: "#ffffff"
  },
  {
    id: "sunset-orange",
    name: "Sunset",
    preview: "Aa",
    style: {
      fontSize: 46,
      fontWeight: "bold",
      color: "#ffffff",
      textShadow: "0 0 12px #ff4500",
      backgroundColor: "transparent",
    },
    bgColor: "#ff6347",
    textColor: "#ffffff",
    canvasBackground: {
      type: 'color',
      value: '#ff6347'
    }
  },
  {
    id: "ocean-depth",
    name: "Ocean",
    preview: "Aa",
    style: {
      fontSize: 48,
      fontWeight: "600",
      color: "#ffffff",
      textShadow: "2px 2px 6px rgba(0, 0, 0, 0.7)",
      backgroundColor: "transparent",
    },
    bgColor: "#4682b4",
    textColor: "#ffffff",
    canvasBackground: {
      type: 'color',
      value: '#4682b4'
    }
  },
  {
    id: "forest-green",
    name: "Forest",
    preview: "Aa",
    style: {
      fontSize: 44,
      fontWeight: "500",
      color: "#ffffff",
      textShadow: "1px 1px 4px rgba(0, 0, 0, 0.6)",
      backgroundColor: "transparent",
    },
    bgColor: "#228b22",
    textColor: "#ffffff",
    canvasBackground: {
      type: 'color',
      value: '#228b22'
    }
  },
  {
    id: "elegant-gray",
    name: "Elegant Gray",
    preview: "Aa",
    style: {
      fontSize: 42,
      fontWeight: "300",
      color: "#333333",
      backgroundColor: "#f0f0f0",
    },
    bgColor: "#f0f0f0",
    textColor: "#333333"
  },
  {
    id: "bright-yellow",
    name: "Bright Yellow",
    preview: "Aa",
    style: {
      fontSize: 48,
      fontWeight: "bold",
      color: "#000000",
      textShadow: "2px 2px 4px rgba(255, 215, 0, 0.8)",
      backgroundColor: "#ffd700",
    },
    bgColor: "#ffd700",
    textColor: "#000000"
  }
];

export function TextStylePresets({ element, track }: TextStylePresetsProps) {
  const { updateTextElement } = useTimelineStore();
  const { updateBackgroundType } = useProjectStore();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Apply text style preset
  const applyPreset = (preset: typeof TEXT_STYLE_PRESETS[0]) => {
    const updates: Partial<TextElement> = {};
    
    if (preset.style.fontSize) updates.fontSize = preset.style.fontSize;
    if (preset.style.fontWeight) updates.fontWeight = preset.style.fontWeight;
    if (preset.style.color) updates.color = preset.style.color;
    if (preset.style.backgroundColor !== undefined) updates.backgroundColor = preset.style.backgroundColor;
    if (preset.style.textShadow) updates.textShadow = preset.style.textShadow;
    
    updateTextElement(track.id, element.id, updates);
    
    // Apply canvas background if specified
    if (preset.canvasBackground) {
      if (preset.canvasBackground.type === 'color') {
        updateBackgroundType('color', { backgroundColor: preset.canvasBackground.value });
      }
    }
    
    setSelectedPreset(preset.id);
    toast.success(`Applied ${preset.name} style`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Type className="h-4 w-4" />
          Text Style Presets
        </CardTitle>
        <CardDescription className="text-xs">
          Choose from pre-designed text styles like CapCut
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {TEXT_STYLE_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className={`
                relative aspect-square rounded-lg border cursor-pointer transition-all duration-200 overflow-hidden group
                ${selectedPreset === preset.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-accent-foreground'}
              `}
              style={{ backgroundColor: preset.bgColor }}
              onClick={() => applyPreset(preset)}
            >
              {/* Preview text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="text-lg font-bold select-none"
                  style={{
                    color: preset.textColor,
                    textShadow: preset.style.textShadow,
                    fontWeight: preset.style.fontWeight,
                  }}
                >
                  {preset.preview}
                </div>
              </div>
              
              {/* Style name overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {preset.name}
              </div>
              
              {/* Selected indicator */}
              {selectedPreset === preset.id && (
                <div className="absolute top-1 right-1">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Clear selection button */}
        {selectedPreset && (
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPreset(null);
                toast.success("Cleared style preset selection");
              }}
              className="w-full text-xs h-7"
            >
              Clear Selection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
