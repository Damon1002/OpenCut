"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TextElement, TimelineTrack } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Palette, Play, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AITextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  element: TextElement;
  track: TimelineTrack;
  onAnimationTrigger: (animation: string) => void;
}

const ANIMATION_PRESETS = [
  { name: "Fade In", value: "fadeIn", description: "Smooth fade in with scale" },
  { name: "Slide In", value: "slideIn", description: "Slide in from left" },
  { name: "Bounce", value: "bounce", description: "Bouncy entrance" },
  { name: "Typewriter", value: "typewriter", description: "Letter by letter reveal" },
  { name: "Glow", value: "glow", description: "Glowing text effect" },
];

const STYLE_SUGGESTIONS = [
  "Make it bold and dramatic",
  "Create a vintage look",
  "Make it modern and sleek",
  "Add a neon glow effect",
  "Make it elegant and refined",
  "Create a comic book style",
  "Make it minimalist",
  "Add a retro 80s vibe",
];

export function AITextEditor({
  isOpen,
  onClose,
  element,
  track,
  onAnimationTrigger,
}: AITextEditorProps) {
  const { updateTextElement } = useTimelineStore();
  const [activeTab, setActiveTab] = useState("style");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedStyles, setGeneratedStyles] = useState<any[]>([]);
  const [selectedAnimation, setSelectedAnimation] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Load API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem("google-ai-api-key");
    if (savedApiKey) {
      setAiApiKey(savedApiKey);
    }
  }, []);

  // Save API key to localStorage
  const handleApiKeySave = () => {
    localStorage.setItem("google-ai-api-key", aiApiKey);
    toast.success("API key saved successfully");
  };

  // Generate styles using Google AI
  const generateStyles = async () => {
    if (!aiApiKey) {
      toast.error("Please enter your Google AI API key");
      return;
    }

    if (!prompt) {
      toast.error("Please enter a style description");
      return;
    }

    setIsLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(aiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const systemPrompt = `You are a text styling assistant for a video editor. Given a text element and a style description, generate CSS-like styling options that can be applied to text. The current text is: "${element.content}".

Current styles:
- Font size: ${element.fontSize}px
- Font family: ${element.fontFamily}
- Color: ${element.color}
- Background: ${element.backgroundColor}
- Text align: ${element.textAlign}
- Font weight: ${element.fontWeight}
- Font style: ${element.fontStyle}
- Text decoration: ${element.textDecoration}

Generate 3 different styling variations based on this request: "${prompt}"

Return ONLY a JSON array with this exact structure:
[
  {
    "name": "Style Name",
    "description": "Brief description",
    "fontSize": 48,
    "fontFamily": "Arial",
    "color": "#ffffff",
    "backgroundColor": "transparent",
    "textAlign": "center",
    "fontWeight": "bold",
    "fontStyle": "normal",
    "textDecoration": "none",
    "textShadow": "0 0 10px rgba(255,255,255,0.5)",
    "opacity": 1
  }
]

Make sure all color values are valid hex codes, fontSize is a number, and all other values match the expected format.`;

      const result = await model.generateContent(systemPrompt);
      const response = result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const styles = JSON.parse(jsonMatch[0]);
        setGeneratedStyles(styles);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error generating styles:", error);
      toast.error("Failed to generate styles. Please check your API key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply generated style
  const applyStyle = (style: any) => {
    const updates: Partial<TextElement> = {};
    
    if (style.fontSize) updates.fontSize = style.fontSize;
    if (style.fontFamily) updates.fontFamily = style.fontFamily;
    if (style.color) updates.color = style.color;
    if (style.backgroundColor) updates.backgroundColor = style.backgroundColor;
    if (style.textAlign) updates.textAlign = style.textAlign;
    if (style.fontWeight) updates.fontWeight = style.fontWeight;
    if (style.fontStyle) updates.fontStyle = style.fontStyle;
    if (style.textDecoration) updates.textDecoration = style.textDecoration;
    if (style.opacity !== undefined) updates.opacity = style.opacity;

    updateTextElement(track.id, element.id, updates);
    toast.success(`Applied ${style.name} style`);
  };

  // Quick style presets
  const quickStyles = [
    {
      name: "Bold Title",
      style: {
        fontSize: 64,
        fontWeight: "bold",
        color: "#ffffff",
        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
      },
    },
    {
      name: "Subtitle",
      style: {
        fontSize: 32,
        fontWeight: "normal",
        color: "#cccccc",
        fontStyle: "italic",
      },
    },
    {
      name: "Neon Glow",
      style: {
        fontSize: 48,
        fontWeight: "bold",
        color: "#00ff00",
        textShadow: "0 0 20px #00ff00, 0 0 30px #00ff00",
      },
    },
  ];

  // Handle animation trigger
  const handleAnimationTrigger = (animation: string) => {
    setSelectedAnimation(animation);
    onAnimationTrigger(animation);
    toast.success(`Playing ${animation} animation`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-8 border-b">
          <div className="flex items-center gap-4">
            <Sparkles className="h-8 w-8 text-blue-500" />
            <h2 className="text-3xl font-semibold">AI Text Editor</h2>
          </div>
          <Button variant="text" size="icon" onClick={onClose} className="h-12 w-12">
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(95vh-140px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-16">
              <TabsTrigger value="style" className="text-lg h-14">AI Styling</TabsTrigger>
              <TabsTrigger value="animation" className="text-lg h-14">Animation</TabsTrigger>
              <TabsTrigger value="settings" className="text-lg h-14">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="style" className="space-y-6">
              {/* API Key Section */}
              {!aiApiKey && (
                <Card className="p-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <Wand2 className="h-6 w-6" />
                      Setup Google AI
                    </CardTitle>
                    <CardDescription className="text-base">
                      Enter your Google AI Studio API key to enable AI-powered text styling
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="apiKey" className="text-lg">Google AI API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your API key"
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        className="h-14 text-base"
                      />
                    </div>
                    <Button onClick={handleApiKeySave} className="w-full h-14 text-lg">
                      Save API Key
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Quick Styles */}
              <Card className="p-4">
                <CardHeader>
                  <CardTitle className="text-2xl">Quick Styles</CardTitle>
                  <CardDescription className="text-base">Apply pre-made styles instantly</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {quickStyles.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        onClick={() => applyStyle(preset.style)}
                        className="h-auto p-6 text-left"
                      >
                        <div>
                          <div className="font-semibold text-lg">{preset.name}</div>
                          <div className="text-sm text-muted-foreground mt-2">
                            {preset.style.fontSize}px
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Style Generator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Style Generator
                  </CardTitle>
                  <CardDescription>
                    Describe the style you want and let AI generate options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Style Description</Label>
                    <Textarea
                      id="prompt"
                      placeholder="e.g., Make it bold and dramatic with a neon glow effect"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {STYLE_SUGGESTIONS.map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setPrompt(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>

                  <Button
                    onClick={generateStyles}
                    disabled={isLoading || !aiApiKey}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Styles
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Styles */}
              {generatedStyles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Styles</CardTitle>
                    <CardDescription>Click to apply a style</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {generatedStyles.map((style, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => applyStyle(style)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{style.name}</h4>
                            <Badge variant="outline">{style.fontSize}px</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {style.description}
                          </p>
                          <div
                            className="text-center p-2 rounded border"
                            style={{
                              fontSize: `${Math.min(style.fontSize / 2, 24)}px`,
                              fontFamily: style.fontFamily,
                              color: style.color,
                              backgroundColor: style.backgroundColor,
                              fontWeight: style.fontWeight,
                              fontStyle: style.fontStyle,
                              textDecoration: style.textDecoration,
                              textShadow: style.textShadow,
                            }}
                          >
                            {element.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="animation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Text Animations</CardTitle>
                  <CardDescription>
                    Choose from various entrance animations powered by GSAP
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {ANIMATION_PRESETS.map((animation) => (
                      <div
                        key={animation.value}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{animation.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {animation.description}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleAnimationTrigger(animation.value)}
                          className="ml-4"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>
                    Manage your Google AI Studio API key
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKeySettings">Google AI API Key</Label>
                    <Input
                      id="apiKeySettings"
                      type="password"
                      placeholder="Enter your API key"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleApiKeySave}>
                    Save API Key
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      Get your API key from{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}
