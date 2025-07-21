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
import { useRef, useCallback, useEffect, useState } from "react";

export function TextProperties({
  element,
  trackId,
}: {
  element: TextElement;
  trackId: string;
}) {
  const { updateTextElement, tracks } = useTimelineStore();
  const gsapRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textValue, setTextValue] = useState(element.content);

  // Find the track for this element
  const track = tracks.find((t) => t.id === trackId);

  // Auto-resize textarea function
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the required height based on content
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 72; // min-h-[4.5rem] = 72px
    const maxHeight = 300; // Maximum height before scrolling
    
    // Set the height, respecting min and max constraints
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Adjust height when element content changes
  useEffect(() => {
    setTextValue(element.content);
    // Adjust height after content update
    setTimeout(adjustTextareaHeight, 0);
  }, [element.content, adjustTextareaHeight]);

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
        ref={textareaRef}
        placeholder="Enter your text here..."
        value={textValue}
        className="min-h-[4.5rem] max-h-[18.75rem] resize-none bg-background/50 overflow-y-auto"
        onChange={(e) => {
          const newValue = e.target.value;
          setTextValue(newValue);
          updateTextElement(trackId, element.id, { content: newValue });
          // Adjust height after content change
          setTimeout(adjustTextareaHeight, 0);
        }}
        onInput={adjustTextareaHeight}
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
