"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { AlignLeft, AlignCenter, AlignRight, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextAlignmentToolbarProps {
  currentAlignment: "left" | "center" | "right";
  onAlignmentChange: (alignment: "left" | "center" | "right") => void;
  position: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export function TextAlignmentToolbar({
  currentAlignment,
  onAlignmentChange,
  position,
  onPositionChange,
}: TextAlignmentToolbarProps) {
  const alignmentOptions = [
    {
      value: "left" as const,
      icon: AlignLeft,
      label: "Align Left",
    },
    {
      value: "center" as const,
      icon: AlignCenter,
      label: "Align Center",
    },
    {
      value: "right" as const,
      icon: AlignRight,
      label: "Align Right",
    },
  ];

  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPosition: { x: 0, y: 0 }
  });
  const animationFrameRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX - position.x,
      startY: e.clientY - position.y,
      startPosition: { ...position }
    };
    setDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.isDragging) return;
      
      const newX = e.clientX - dragStateRef.current.startX;
      const newY = e.clientY - dragStateRef.current.startY;
      
      const newPosition = { x: newX, y: newY };
      
      // Store the pending position and request an animation frame
      pendingPositionRef.current = newPosition;
      
      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(() => {
          if (pendingPositionRef.current && onPositionChange) {
            onPositionChange(pendingPositionRef.current);
          }
          animationFrameRef.current = null;
        });
      }
    };

    const handleMouseUp = () => {
      dragStateRef.current.isDragging = false;
      setDragging(false);
      
      // Clean up animation frame if pending
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      document.removeEventListener('mousemove', handleMouseMove, { passive: false } as any);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed pointer-events-auto z-50 flex items-center"
      style={{
        left: position.x,
        top: position.y,
        transform: "translateX(-50%)",
      }}
    >
      {/* Drag handle */}
      <div
        className="bg-gray-700/95 backdrop-blur-sm border border-gray-600/50 rounded-l-lg shadow-xl p-2 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-gray-600/95 transition-colors"
        onMouseDown={handleMouseDown}
        title="Drag to move toolbar"
      >
        <GripHorizontal className="w-4 h-4 text-gray-300" />
      </div>
      
      {/* Professional video editing toolbar style */}
      <div className="bg-gray-800/95 backdrop-blur-sm border border-l-0 border-gray-600/50 rounded-r-lg shadow-xl p-1 flex items-center space-x-1">
        {alignmentOptions.map((option) => {
          const IconComponent = option.icon;
          const isActive = currentAlignment === option.value;
          
          return (
            <button
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                onAlignmentChange(option.value);
              }}
              className={cn(
                "p-2.5 rounded-md transition-all duration-150 flex items-center justify-center group relative",
                "hover:bg-white/10 active:scale-95",
                isActive ? 
                  "bg-blue-500 text-white shadow-md hover:bg-blue-600" : 
                  "text-gray-300 hover:text-white"
              )}
              title={option.label}
            >
              <IconComponent className="w-5 h-5" />
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Professional arrow pointing up */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div className="w-3 h-3 bg-gray-800/95 border-l border-t border-gray-600/50 rotate-45"></div>
      </div>
    </motion.div>
  );
}
