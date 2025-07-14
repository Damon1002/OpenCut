"use client";

import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TextElement, TimelineTrack } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AITextPropertiesProps {
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
];

export function AITextProperties({
  element,
  track,
  onAnimationTrigger,
}: AITextPropertiesProps) {
  const { updateTextElement } = useTimelineStore();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedStyles, setGeneratedStyles] = useState<any[]>([]);
  const [aiApiKey, setAiApiKey] = useState("");

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
    onAnimationTrigger(animation);
    toast.success(`Playing ${animation} animation`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold">AI Text Editor</h3>
      </div>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="style">AI Styling</TabsTrigger>
          <TabsTrigger value="animation">Animation</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="space-y-4">
          {/* Quick Styles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Styles</CardTitle>
              <CardDescription className="text-xs">Apply pre-made styles instantly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {quickStyles.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => applyStyle(preset.style)}
                    className="h-auto p-2 text-left text-xs"
                  >
                    <div>
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Style Generator
              </CardTitle>
              <CardDescription className="text-xs">
                Describe the style you want
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-xs">Style Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g., Make it bold and dramatic"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[60px] text-xs"
                />
              </div>
              
              <div className="flex flex-wrap gap-1">
                {STYLE_SUGGESTIONS.map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs py-1 px-2"
                    onClick={() => setPrompt(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>

              <Button
                onClick={generateStyles}
                disabled={isLoading || !aiApiKey}
                className="w-full text-xs h-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3 w-3" />
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
                <CardTitle className="text-sm">Generated Styles</CardTitle>
                <CardDescription className="text-xs">Click to apply a style</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {generatedStyles.map((style, index) => (
                    <div
                      key={index}
                      className="p-2 border rounded cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => applyStyle(style)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-xs">{style.name}</h4>
                        <Badge variant="outline" className="text-xs">{style.fontSize}px</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {style.description}
                      </p>
                      <div
                        className="text-center p-1 rounded border text-xs"
                        style={{
                          fontSize: `${Math.min(style.fontSize / 3, 14)}px`,
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

        <TabsContent value="animation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Text Animations</CardTitle>
              <CardDescription className="text-xs">
                Choose from various entrance animations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ANIMATION_PRESETS.map((animation) => (
                  <div
                    key={animation.value}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <h4 className="font-medium text-xs">{animation.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {animation.description}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleAnimationTrigger(animation.value)}
                      className="ml-2 h-6 text-xs"
                      size="sm"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">API Configuration</CardTitle>
              <CardDescription className="text-xs">
                Manage your Google AI Studio API key
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="apiKeySettings" className="text-xs">Google AI API Key</Label>
                <Input
                  id="apiKeySettings"
                  type="password"
                  placeholder="Enter your API key"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  className="text-xs"
                />
              </div>
              <Button onClick={handleApiKeySave} className="text-xs h-7">
                Save API Key
              </Button>
              <div className="text-xs text-muted-foreground">
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
  );
}
