import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { useTimelineStore } from "@/stores/timeline-store";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { toast } from "sonner";

export function TextView() {
  const { addTrack, addElementToTrack } = useTimelineStore();

  const handleAddDefaultText = () => {
    try {
      // Create a new text track
      const newTrackId = addTrack("text");
      
      // Add the default text element to the track
      addElementToTrack(newTrackId, {
        type: "text",
        name: "Default text",
        content: "Default text",
        duration: TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION,
        startTime: 0,
        trimStart: 0,
        trimEnd: 0,
        fontSize: 48,
        fontFamily: "Arial",
        color: "#ffffff",
        backgroundColor: "transparent",
        textAlign: "center",
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
      });
      
      toast.success("Text added to timeline");
    } catch (error) {
      console.error("Error adding text to timeline:", error);
      toast.error("Failed to add text to timeline");
    }
  };

  return (
    <div className="p-4">
      <DraggableMediaItem
        name="Default text"
        preview={
          <div className="flex items-center justify-center w-full h-full bg-accent rounded">
            <span className="text-xs select-none">Default text</span>
          </div>
        }
        dragData={{
          id: "default-text",
          type: "text",
          name: "Default text",
          content: "Default text",
        }}
        aspectRatio={1}
        showLabel={false}
        onPlusClick={handleAddDefaultText}
      />
    </div>
  );
}
