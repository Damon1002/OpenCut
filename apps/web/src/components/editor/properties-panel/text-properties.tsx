import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import { FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
} from "./property-item";
import { AITextProperties } from "./ai-text-properties";
import { gsap } from "gsap";
import { useRef, useCallback } from "react";

export function TextProperties({
  element,
  trackId,
}: {
  element: TextElement;
  trackId: string;
}) {
  const { updateTextElement, tracks } = useTimelineStore();
  const gsapRef = useRef<HTMLDivElement>(null);

  // Find the track for this element
  const track = tracks.find((t) => t.id === trackId);

  // Animation trigger function
  const playAnimation = useCallback((animation: string) => {
    // Dispatch custom event to trigger animation on the text element in the preview
    const animationEvent = new CustomEvent('triggerTextAnimation', {
      detail: {
        elementId: element.id,
        trackId: trackId,
        animation: animation
      }
    });
    window.dispatchEvent(animationEvent);
    console.log(`Triggered ${animation} animation for element ${element.id}`);
  }, [element.id, trackId]);

  if (!track) return null;

  return (
    <div className="space-y-6 p-5">
      <Textarea
        placeholder="Name"
        defaultValue={element.content}
        className="min-h-[4.5rem] resize-none bg-background/50"
        onChange={(e) =>
          updateTextElement(trackId, element.id, { content: e.target.value })
        }
      />
      <PropertyItem direction="row">
        <PropertyItemLabel>Font</PropertyItemLabel>
        <PropertyItemValue>
          <FontPicker
            defaultValue={element.fontFamily}
            onValueChange={(value: FontFamily) =>
              updateTextElement(trackId, element.id, { fontFamily: value })
            }
          />
        </PropertyItemValue>
      </PropertyItem>
      
      {/* AI Text Editor */}
      <div className="border-t pt-6">
        <AITextProperties
          element={element}
          track={track}
          onAnimationTrigger={playAnimation}
        />
      </div>
    </div>
  );
}
