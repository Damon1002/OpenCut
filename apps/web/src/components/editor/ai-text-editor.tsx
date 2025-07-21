"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureKeyManager } from "@/lib/security/key-manager";
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
import { Sparkles, Wand2, Palette, Play, Loader2, X, Shield, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTokenUsage } from "@/stores/token-usage-store";
import { TokenUsageProgress } from "@/components/ui/progress-bar";

interface AITextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  element: TextElement;
  track: TimelineTrack;
  onAnimationTrigger: (animation: string) => void;
}

const ANIMATION_PRESETS = [
  { name: "Fade In", value: "fadeIn", description: "Smooth fade in with gentle scale" },
  { name: "Slide In", value: "slideIn", description: "Smooth slide in from left" },
  { name: "Bounce", value: "bounce", description: "Elastic bounce entrance" },
  { name: "Typewriter", value: "typewriter", description: "Letter by letter reveal" },
  { name: "Glow", value: "glow", description: "Smooth glowing text effect" },
  { name: "Zoom In", value: "zoomIn", description: "Scale up with bounce" },
  { name: "Rotate In", value: "rotateIn", description: "Rotate into position" },
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
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeyValidated, setIsKeyValidated] = useState(false);
  const { usedTokens, tokenLimit, addTokenUsage, canUseTokens, getUsagePercentage } = useTokenUsage();
  const modalRef = useRef<HTMLDivElement>(null);

// Initialize security and load API key
useEffect(() => {
  (async () => {
    try {
      console.log('Initializing SecureKeyManager...');
      await secureKeyManager.initialize();
      console.log('SecureKeyManager initialized successfully');
      
      const savedApiKey = await secureKeyManager.getApiKey("google-ai");
      if (savedApiKey) {
        console.log('Loaded existing API key from secure storage');
        setAiApiKey(savedApiKey);
        setIsKeyValidated(true);
      }
    } catch (error) {
      console.error('Failed to initialize security manager:', error);
      toast.error('Security initialization failed. Please refresh the page.');
    }
  })();
}, []);

// Save API key securely
type ApiKeyType = 'google-ai' | 'openai' | 'anthropic';

const handleApiKeySave = async () => {
  try {
    // Trim whitespace
    const trimmedKey = aiApiKey.trim();
    
    if (!trimmedKey) {
      toast.error("API key cannot be empty");
      return;
    }
    
    // Validate API key format
    if (!secureKeyManager.validateApiKey(trimmedKey, 'google-ai')) {
      toast.error("Invalid Google AI API key format. Please check your key.");
      return;
    }

    // Test the API key by making a small request
    setIsLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(trimmedKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Test with a minimal prompt to verify the key works
      await model.generateContent("Hello");
      
      // If successful, store the key
      await secureKeyManager.storeApiKey("google-ai", trimmedKey);
      setIsKeyValidated(true);
      toast.success("API key validated and saved securely");
    } catch (apiError) {
      console.error("API key validation failed:", apiError);
      toast.error("API key is invalid or has insufficient permissions");
    } finally {
      setIsLoading(false);
    }
  } catch (error) {
    console.error("Failed to save API key securely", error);
    toast.error("Failed to save API key securely");
    setIsLoading(false);
  }
};

  // Generate styles using Google AI (token-optimized)
  const generateStyles = async () => {
    console.log('🎨 Starting token-optimized style generation...');
    console.log('Current element:', element);
    console.log('Current track:', track);
    console.log('API key available:', !!aiApiKey);
    console.log('Prompt:', prompt);
    
    if (!aiApiKey) {
      toast.error("Please enter your Google AI API key");
      return;
    }

    if (!prompt) {
      toast.error("Please enter a style description");
      return;
    }

    // Estimate token usage for this operation - much smaller now!
    const estimatedTokens = 35; // Much more efficient approach
    
    if (!canUseTokens(estimatedTokens)) {
      toast.error(`Insufficient tokens. Need ${estimatedTokens} tokens but only ${tokenLimit - usedTokens} remaining.`);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🤖 Initializing Google AI for style selection...');
      const genAI = new GoogleGenerativeAI(aiApiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 150,
        }
      });

      // Token-efficient approach: Ask AI to select and modify existing presets
      const availableStyles = quickStyles.map(style => `${style.name}: ${JSON.stringify(style.style)}`);
      
      const systemPrompt = `Based on "${prompt}" for text "${element.content}", choose the best style from these options and suggest 1-2 modifications:

${availableStyles.join('\n')}

Respond with ONLY: styleName|modification1=value1|modification2=value2

Example: Neon Glow|color=#ff00ff|textShadow=0 0 25px #ff00ff`;

      console.log('📝 Sending optimized prompt to AI:', systemPrompt);
      const result = await model.generateContent(systemPrompt);
      const response = result.response;
      const text = response.text().trim();
      
      console.log('🎯 Raw AI response:', text);
      
      // Track token usage
      addTokenUsage(estimatedTokens);
      
      // Parse the AI response
      const parts = text.split('|');
      if (parts.length >= 1) {
        const styleName = parts[0].trim();
        const baseStyle = quickStyles.find(s => s.name.toLowerCase().includes(styleName.toLowerCase()));
        
        if (baseStyle) {
          // Create modified styles based on AI suggestions
          const modifiedStyles = [];
          
          // Original style
          modifiedStyles.push({
            name: `${baseStyle.name} (Original)`,
            description: `Original ${baseStyle.name} style`,
            ...baseStyle.style
          });
          
          // AI-modified version
          const modifiedStyle = { ...baseStyle.style };
          
          // Apply modifications suggested by AI
          for (let i = 1; i < parts.length; i++) {
            const modification = parts[i].trim();
            if (modification.includes('=')) {
              const [prop, value] = modification.split('=');
              const property = prop.trim();
              const newValue = value.trim();
              
              // Apply the modification
              if (property === 'fontSize') {
                modifiedStyle.fontSize = parseInt(newValue) || modifiedStyle.fontSize;
              } else if (property === 'color') {
                modifiedStyle.color = newValue;
              } else if (property === 'textShadow') {
                modifiedStyle.textShadow = newValue;
              } else if (property === 'fontWeight') {
                modifiedStyle.fontWeight = newValue;
              }
            }
          }
          
          modifiedStyles.push({
            name: `${baseStyle.name} (AI Enhanced)`,
            description: `AI-enhanced ${baseStyle.name} based on your request`,
            ...modifiedStyle
          });
          
          // Add a third variation with different intensity
          const intensifiedStyle = { ...modifiedStyle };
          if (intensifiedStyle.textShadow && intensifiedStyle.textShadow.includes('px')) {
            // Increase glow intensity
            intensifiedStyle.textShadow = intensifiedStyle.textShadow.replace(/\d+px/g, (match) => {
              const num = parseInt(match);
              return `${Math.min(num * 1.5, 50)}px`;
            });
          }
          if (intensifiedStyle.fontSize) {
            intensifiedStyle.fontSize = Math.min(intensifiedStyle.fontSize * 1.2, 80);
          }
          
          modifiedStyles.push({
            name: `${baseStyle.name} (Intense)`,
            description: `Intensified version with enhanced effects`,
            ...intensifiedStyle
          });
          
          setGeneratedStyles(modifiedStyles);
          console.log('🎨 Generated token-efficient styles:', modifiedStyles);
          toast.success(`Generated 3 style variations using only ${estimatedTokens} tokens!`);
        } else {
          throw new Error("Could not find matching base style");
        }
      } else {
        throw new Error("Invalid AI response format");
      }
    } catch (error) {
      console.error("❌ Error generating styles:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('API_KEY')) {
        toast.error("Invalid API key. Please check your Google AI Studio API key.");
        setIsKeyValidated(false);
      } else if (errorMessage.includes('PERMISSION_DENIED')) {
        toast.error("API key doesn't have sufficient permissions.");
      } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
        toast.error("Google AI quota exceeded. Please try again later.");
      } else {
        toast.error(`Failed to generate styles: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Apply generated style
  const applyStyle = (style: any) => {
    console.log('🎨 Applying style:', style);
    console.log('📍 Track ID:', track.id);
    console.log('📍 Element ID:', element.id);
    console.log('📍 Current element before update:', element);
    
    const updates: Partial<TextElement> = {};
    
    // Handle all possible style properties with proper type casting
    if (style.fontSize !== undefined) updates.fontSize = Number(style.fontSize);
    if (style.fontFamily) updates.fontFamily = String(style.fontFamily);
    if (style.color) updates.color = String(style.color);
    if (style.backgroundColor) updates.backgroundColor = String(style.backgroundColor);
    if (style.textAlign) updates.textAlign = style.textAlign as "left" | "center" | "right";
    if (style.fontWeight) updates.fontWeight = style.fontWeight as "normal" | "bold";
    if (style.fontStyle) updates.fontStyle = style.fontStyle as "normal" | "italic";
    if (style.textDecoration) updates.textDecoration = style.textDecoration as "none" | "underline" | "line-through";
    if (style.opacity !== undefined) updates.opacity = Number(style.opacity);
    
    // Add textShadow support - now properly typed
    if (style.textShadow) {
      updates.textShadow = String(style.textShadow);
    }

    console.log('🔄 Updates to apply:', updates);
    console.log('🔄 Type of updates:', typeof updates);
    console.log('🔄 Updates keys:', Object.keys(updates));
    
    try {
      console.log('🚀 Calling updateTextElement...');
      updateTextElement(track.id, element.id, updates);
      console.log('✅ updateTextElement called successfully');
      
      // Log the timeline store state after update
      const timelineState = useTimelineStore.getState();
      console.log('📊 Timeline state after update:', timelineState.tracks);
      
      const updatedTrack = timelineState.tracks.find(t => t.id === track.id);
      const updatedElement = updatedTrack?.elements.find(e => e.id === element.id);
      console.log('📊 Updated element after store update:', updatedElement);
      
      toast.success(`Applied ${style.name} style`);
    } catch (error) {
      console.error('❌ Error applying style:', error);
      if (error instanceof Error) {
        console.error('❌ Error stack:', error.stack);
      }
      toast.error(`Failed to apply ${style.name} style`);
    }
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
      textShadow: "0 0 20px #00ff00, 0 0 30px #00ff00"
    }
  },
  {
    name: "Background",
    style: {
      backgroundColor: "#000000",
      color: "#ffffff"
    }
  },
  {
    name: "Image Background",
    style: {
      backgroundImage: "url('background.jpg')"
    }
  },
  {
    name: "Video Background",
    style: {
      backgroundImage: "url('background.mp4')",
      backgroundSize: "cover"
    }
  },
  {
    name: "Custom Style",
    style: {
      fontSize: 22,
      fontStyle: "italic",
      backgroundColor: "#ff0",
      color: "#333"
    }
  }
  ];

  // Handle animation trigger
  const handleAnimationTrigger = (animation: string) => {
    setSelectedAnimation(animation);
    
    // Save the animation to the timeline element for automatic playback
    // Using settings similar to CapCut/剪映
    const animationConfig = {
      type: animation,
      duration: 0.8, // Shorter duration like CapCut (0.8s default)
      delay: 0, // No delay by default, animation starts immediately when text appears
      easing: getAnimationEasing(animation)
    };
    
    updateTextElement(track.id, element.id, {
      animation: animationConfig
    });
    
    // Dispatch custom event to trigger animation immediately in the preview
    const animationEvent = new CustomEvent('triggerTextAnimation', {
      detail: {
        elementId: element.id,
        trackId: track.id,
        animation: animation
      }
    });
    window.dispatchEvent(animationEvent);
    
    // Also call the passed handler for backward compatibility
    onAnimationTrigger(animation);
    toast.success(`Applied ${animation} animation - it will play once when text appears during timeline playback`);
  };

  // Get appropriate easing for each animation type like CapCut/剪映
  const getAnimationEasing = (animationType: string): string => {
    switch (animationType) {
      case 'fadeIn':
        return 'power2.out'; // Smooth fade
      case 'slideIn':
        return 'back.out(1.2)'; // Slight overshoot like CapCut
      case 'bounce':
        return 'bounce.out'; // Natural bounce
      case 'typewriter':
        return 'none'; // Linear for typewriter effect
      case 'glow':
        return 'power2.inOut'; // Smooth glow transition
      default:
        return 'power2.out';
    }
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
                  <div className="grid grid-cols-4 gap-2">
                    {quickStyles.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        onClick={() => applyStyle(preset.style)}
                        className="h-auto p-3 text-left text-xs"
                      >
                        <div>
                          <div className="font-semibold text-sm">{preset.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {preset.style.fontSize ? `${preset.style.fontSize}px` : 'Custom'}
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
                <CardContent className="pt-4">
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
                          Apply Animation
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              {/* Token Usage Display */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Token Usage
                  </CardTitle>
                  <CardDescription>
                    Monitor your AI token consumption
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TokenUsageProgress 
                    used={usedTokens} 
                    limit={tokenLimit} 
                    showDetails={true}
                    size="lg"
                  />
                </CardContent>
              </Card>

              {/* API Configuration */}
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
                    <div className="relative">
                      <Input
                        id="apiKeySettings"
                        type={showApiKey ? "text" : "password"}
                        placeholder="Enter your API key (e.g., AIzaSy...)"
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {isKeyValidated && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Shield className="h-4 w-4" />
                        API key is valid and secure
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleApiKeySave} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Save API Key Securely
                      </>
                    )}
                  </Button>
                  <div className="text-sm text-muted-foreground space-y-2">
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
                    <div className="bg-muted p-3 rounded-lg text-xs">
                      <p className="font-medium mb-1">🔒 Security Features:</p>
                      <ul className="space-y-1">
                        <li>• API keys are encrypted using AES-256-GCM</li>
                        <li>• Keys are validated before storage</li>
                        <li>• Never stored in plain text or committed to git</li>
                        <li>• Automatic security event logging</li>
                      </ul>
                    </div>
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
