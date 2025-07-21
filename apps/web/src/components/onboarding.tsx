"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Onboarding({ isOpen, onClose }: OnboardingProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to OpenCut Alpha</DialogTitle>
          <DialogDescription>
            You're among the first to try our early alpha version. Let's get you started!
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
