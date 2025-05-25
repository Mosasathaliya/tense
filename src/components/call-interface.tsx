
"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';

import { ahmedVoiceCall } from '@/ai/flows/ahmed-voice-call';
import { saraVoiceCall } from '@/ai/flows/sara-voice-call';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, PhoneOff, User, MessageCircle, Mic, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ahmedSchema = z.object({
  englishGrammarConcept: z.string().min(3, { message: "Please enter a grammar concept (min. 3 characters)." }),
});
type AhmedFormData = z.infer<typeof ahmedSchema>;

const saraSchema = z.object({
  englishGrammarConcept: z.string().min(3, { message: "Please enter a grammar concept (min. 3 characters)." }),
  userLanguageProficiency: z.string().min(2, { message: "Please describe your proficiency (min. 2 characters)." }),
});
type SaraFormData = z.infer<typeof saraSchema>;

type Teacher = "Ahmed" | "Sara";
type CallState = "idle" | "calling" | "active" | "error";

export function CallInterface() {
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher>("Ahmed");
  const [callState, setCallState] = useState<CallState>("idle");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const { toast } = useToast();

  const ahmedForm = useForm<AhmedFormData>({
    resolver: zodResolver(ahmedSchema),
    defaultValues: { englishGrammarConcept: "" },
  });

  const saraForm = useForm<SaraFormData>({
    resolver: zodResolver(saraSchema),
    defaultValues: { englishGrammarConcept: "", userLanguageProficiency: "" },
  });

  // Effect to reset state and cancel speech when teacher changes
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCallState("idle");
    setExplanation(null);
    ahmedForm.reset({ englishGrammarConcept: "" });
    saraForm.reset({ englishGrammarConcept: "", userLanguageProficiency: "" });
    ahmedForm.clearErrors();
    saraForm.clearErrors();
  }, [selectedTeacher, ahmedForm, saraForm]);

  // Effect to handle text-to-speech for explanations
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) { // Check if SpeechSynthesis API is available
      return;
    }

    // If conditions to speak are not met, cancel any ongoing speech and exit.
    if (callState !== 'active' || !explanation || isMuted) {
      synth.cancel();
      return;
    }

    // Conditions to speak are met.
    // It's good practice to cancel any potentially ongoing speech before starting a new one.
    synth.cancel(); 

    const utterance = new SpeechSynthesisUtterance(explanation);
    utterance.lang = 'ar-SA';

    const voices = synth.getVoices();
    const arabicVoice = voices.find(voice => voice.lang.startsWith('ar-'));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }
    
    utterance.onend = () => {
      // Optional: logic when speech ends naturally
      // console.info("Speech finished.");
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      // "interrupted" and "canceled" are expected if speech is stopped programmatically
      if (event.error === 'interrupted' || event.error === 'canceled') {
        console.info(`Speech synthesis event: ${event.error}`);
      } else {
        console.error("Speech synthesis error:", event.error, event);
        toast({
          variant: "destructive",
          title: "Speech Error",
          description: `Could not play the explanation. (Reason: ${event.error})`,
        });
      }
    };

    synth.speak(utterance);

    // Cleanup: cancel speech when component unmounts or dependencies change
    return () => {
      synth.cancel();
    };
  }, [explanation, callState, isMuted]); // Removed toast from dependencies


  const commonSubmitLogic = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
    }
    setCallState("calling");
    setExplanation(null);
  };

  const handleAhmedSubmit: SubmitHandler<AhmedFormData> = async (data) => {
    commonSubmitLogic();
    try {
      const result = await ahmedVoiceCall(data);
      setExplanation(result.explanation);
      setCallState("active");
      toast({
        title: "Explanation Received",
        description: "Ahmed has provided an explanation.",
      });
    } catch (error) {
      console.error("Error calling Ahmed:", error);
      toast({
        variant: "destructive",
        title: "Error Calling Ahmed",
        description: "Failed to get explanation from Ahmed. Please try again.",
      });
      setCallState("error");
    }
  };

  const handleSaraSubmit: SubmitHandler<SaraFormData> = async (data) => {
    commonSubmitLogic();
    try {
      const result = await saraVoiceCall(data);
      setExplanation(result.explanation);
      setCallState("active");
       toast({
        title: "Explanation Received",
        description: "Sara has provided an explanation.",
      });
    } catch (error) {
      console.error("Error calling Sara:", error);
      toast({
        variant: "destructive",
        title: "Error Calling Sara",
        description: "Failed to get explanation from Sara. Please try again.",
      });
      setCallState("error");
    }
  };

  const endCall = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCallState("idle");
    setExplanation(null);
    if (selectedTeacher === "Ahmed") ahmedForm.reset();
    if (selectedTeacher === "Sara") saraForm.reset();
  };

  const toggleMute = () => {
    setIsMuted(prevMuted => {
      const newMutedState = !prevMuted;
      if (newMutedState && window.speechSynthesis) { // If going to be muted (was unmuted)
        window.speechSynthesis.cancel(); // Proactively stop speech
      }
      // If unmuting, the useEffect for speech will handle re-starting speech if applicable.
      return newMutedState;
    });
  };

  const teacherDetails = {
    Ahmed: {
      name: "Ahmed",
      avatarSrc: "https://placehold.co/128x128.png",
      avatarHint: "man portrait",
      description: "AI teacher providing Arabic explanations of English grammar.",
      onSubmit: handleAhmedSubmit,
    },
    Sara: {
      name: "Sara",
      avatarSrc: "https://placehold.co/128x128.png",
      avatarHint: "woman portrait",
      description: "AI teacher tailoring Arabic explanations of English grammar to your proficiency.",
      onSubmit: handleSaraSubmit,
    },
  };

  const currentTeacherInfo = teacherDetails[selectedTeacher];
  const currentForm = selectedTeacher === 'Ahmed' ? ahmedForm : saraForm;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = currentForm;

  return (
    <Card className="w-full max-w-2xl shadow-xl overflow-hidden bg-card">
      <CardHeader className="text-center p-6 bg-muted/30 relative">
        <div className="flex justify-center mb-4">
            <Avatar className="w-28 h-28 border-4 border-primary shadow-lg">
              <Image 
                src={currentTeacherInfo.avatarSrc} 
                alt={currentTeacherInfo.name} 
                width={128} 
                height={128} 
                data-ai-hint={currentTeacherInfo.avatarHint}
                className="object-cover"
              />
              <AvatarFallback className="text-4xl">{selectedTeacher.charAt(0)}</AvatarFallback>
            </Avatar>
        </div>
        <CardTitle className="text-3xl font-semibold text-foreground">{currentTeacherInfo.name}</CardTitle>
        <CardDescription className="text-muted-foreground mt-1">{currentTeacherInfo.description}</CardDescription>
         <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="absolute top-4 right-4 text-muted-foreground hover:text-primary"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </Button>
      </CardHeader>

      <Tabs value={selectedTeacher} onValueChange={(value) => setSelectedTeacher(value as Teacher)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-none h-auto">
          <TabsTrigger value="Ahmed" className="py-4 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-none">
            <User className="mr-2 h-5 w-5" /> Ahmed
          </TabsTrigger>
          <TabsTrigger value="Sara" className="py-4 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-none">
            <User className="mr-2 h-5 w-5" /> Sara
          </TabsTrigger>
        </TabsList>

        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSubmit(currentTeacherInfo.onSubmit as SubmitHandler<any>)} className="space-y-6">
            <div>
              <Label htmlFor="englishGrammarConcept" className="text-md font-medium">English Grammar Concept</Label>
              <Textarea
                id="englishGrammarConcept"
                placeholder="e.g., Present Perfect Tense, Conditional Sentences"
                {...register("englishGrammarConcept")}
                className={`mt-2 text-base bg-background focus:ring-2 focus:ring-primary ${errors.englishGrammarConcept ? 'border-destructive focus:ring-destructive' : 'border-border'}`}
                rows={3}
                disabled={callState === "calling" || isSubmitting}
              />
              {errors.englishGrammarConcept && <p className="text-sm text-destructive mt-1">{errors.englishGrammarConcept.message}</p>}
            </div>

            {selectedTeacher === "Sara" && (
              <div>
                <Label htmlFor="userLanguageProficiency" className="text-md font-medium">Your Language Proficiency</Label>
                <Input
                  id="userLanguageProficiency"
                  placeholder="e.g., Beginner, Intermediate, Advanced in English"
                  {...register("userLanguageProficiency")}
                  className={`mt-2 text-base bg-background focus:ring-2 focus:ring-primary ${errors.userLanguageProficiency ? 'border-destructive focus:ring-destructive' : 'border-border'}`}
                  disabled={callState === "calling" || isSubmitting}
                />
                {errors.userLanguageProficiency && <p className="text-sm text-destructive mt-1">{errors.userLanguageProficiency.message}</p>}
              </div>
            )}
            
            <div className="pt-2">
            {callState === "idle" || callState === "error" ? (
              <Button type="submit" className="w-full py-3 text-lg bg-accent hover:bg-accent/90 text-accent-foreground rounded-md shadow-md transition-transform hover:scale-105" disabled={isSubmitting}>
                <Mic className="mr-2 h-5 w-5" /> Start Call
              </Button>
            ) : callState === "calling" ? (
              <Button className="w-full py-3 text-lg bg-accent/80 rounded-md" disabled>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calling {currentTeacherInfo.name}...
              </Button>
            ) : ( // callState === "active"
              <Button type="button" onClick={endCall} variant="outline" className="w-full py-3 text-lg border-primary text-primary hover:bg-primary/10 rounded-md shadow-sm transition-transform hover:scale-105">
                <PhoneOff className="mr-2 h-5 w-5" /> End Call
              </Button>
            )}
            </div>
          </form>

          {callState === "active" && explanation && (
            <div className="mt-6 p-6 bg-secondary/30 rounded-lg shadow-inner border border-border">
              <h3 className="text-xl font-semibold mb-3 text-primary flex items-center">
                <MessageCircle className="mr-2 h-6 w-6" /> {currentTeacherInfo.name}'s Explanation:
              </h3>
              <div className="text-foreground whitespace-pre-wrap text-base leading-relaxed p-2 bg-background rounded" style={{ textAlign: 'right', direction: 'rtl' }}>{explanation}</div>
            </div>
          )}
          {callState === "error" && (
             <div className="mt-6 p-4 bg-destructive/10 text-destructive rounded-lg shadow-inner border border-destructive/30 flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold">Call Failed</h3>
                <p className="text-sm">Could not connect with {currentTeacherInfo.name}. Please try again.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}

