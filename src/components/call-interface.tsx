
"use client";

import { useState, useEffect, useRef } from 'react';
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
import { Loader2, PhoneOff, User, MessageCircle, Mic, AlertTriangle, Volume2, VolumeX, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ahmedSchema = z.object({
  englishGrammarConcept: z.string().min(3, { message: "يرجى إدخال مفهوم قواعدي (3 أحرف على الأقل)." }),
});
type AhmedFormData = z.infer<typeof ahmedSchema>;

const saraSchema = z.object({
  englishGrammarConcept: z.string().min(3, { message: "يرجى إدخال مفهوم قواعدي (3 أحرف على الأقل)." }),
  userLanguageProficiency: z.string().min(2, { message: "يرجى وصف مستوى إتقانك (حرفان على الأقل)." }),
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

  const [isListening, setIsListening] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true); // Assume supported initially
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);


  const ahmedForm = useForm<AhmedFormData>({
    resolver: zodResolver(ahmedSchema),
    defaultValues: { englishGrammarConcept: "" },
  });

  const saraForm = useForm<SaraFormData>({
    resolver: zodResolver(saraSchema),
    defaultValues: { englishGrammarConcept: "", userLanguageProficiency: "" },
  });

  // Effect to reset state, cancel speech, and stop recognition when teacher changes
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechRecognitionRef.current && isListening) {
      speechRecognitionRef.current.abort();
      setIsListening(false);
    }
    setCallState("idle");
    setExplanation(null);
    ahmedForm.reset({ englishGrammarConcept: "" });
    saraForm.reset({ englishGrammarConcept: "", userLanguageProficiency: "" });
    ahmedForm.clearErrors();
    saraForm.clearErrors();
  }, [selectedTeacher, ahmedForm, saraForm]); // isListening is not a dependency here

  // Effect to handle text-to-speech for explanations
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) {
      return;
    }

    if (callState !== 'active' || !explanation || isMuted || isListening) { // Also don't speak if STT is active
      synth.cancel();
      return;
    }
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(explanation);
    utterance.lang = 'ar-SA'; // Arabic speech

    const voices = synth.getVoices();
    const arabicVoice = voices.find(voice => voice.lang.startsWith('ar-'));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }
    
    utterance.onend = () => {};
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      if (event.error === 'interrupted' || event.error === 'canceled') {
        console.info(`Speech synthesis event: ${event.error}`);
      } else {
        console.error("Speech synthesis error:", event.error, event);
        toast({
          variant: "destructive",
          title: "خطأ في النطق",
          description: `تعذر تشغيل الشرح. (السبب: ${event.error})`,
        });
      }
    };
    synth.speak(utterance);
    return () => {
      synth.cancel();
    };
  }, [explanation, callState, isMuted, toast, isListening]);


  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn("Speech Recognition API not supported in this browser.");
      setSpeechRecognitionSupported(false);
      return;
    }
    setSpeechRecognitionSupported(true);

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // User speaks English grammar concept

    recognition.onstart = () => {
      setIsListening(true);
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const currentForm = selectedTeacher === 'Ahmed' ? ahmedForm : saraForm;
      currentForm.setValue("englishGrammarConcept", transcript, { shouldValidate: true });
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      let errorMessage = "خطأ في التعرف على الكلام. يرجى المحاولة مرة أخرى.";
      if (event.error === 'no-speech') {
        errorMessage = "لم يتم اكتشاف أي كلام. يرجى المحاولة مرة أخرى.";
      } else if (event.error === 'audio-capture') {
        errorMessage = "خطأ في التقاط الصوت. تأكد من أن الميكروفون يعمل.";
      } else if (event.error === 'not-allowed') {
        errorMessage = "تم رفض الوصول إلى الميكروفون. يرجى تفعيل الأذونات.";
      }
      toast({ variant: "destructive", title: "خطأ في الإدخال الصوتي", description: errorMessage });
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.abort();
      }
    };
  }, [selectedTeacher, ahmedForm, saraForm, toast]);

  const toggleListening = () => {
    if (!speechRecognitionRef.current || !speechRecognitionSupported) {
      toast({ variant: "destructive", title: "الميزة غير مدعومة", description: "التعرف على الكلام غير متوفر في متصفحك." });
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
    } else {
      try {
        speechRecognitionRef.current.start();
      } catch (e) {
        console.error("Error starting speech recognition:", e);
        toast({ variant: "destructive", title: "خطأ في الإدخال الصوتي", description: "تعذر بدء التعرف. قد يكون مشغولاً أو نشطًا بالفعل."});
        setIsListening(false);
      }
    }
  };

  const commonSubmitLogic = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechRecognitionRef.current && isListening) {
      speechRecognitionRef.current.abort();
      setIsListening(false);
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
        title: "تم استلام الشرح",
        description: "أحمد قدم شرحًا.",
      });
    } catch (error) {
      console.error("Error calling Ahmed:", error);
      toast({
        variant: "destructive",
        title: "خطأ في الاتصال بأحمد",
        description: "فشل الحصول على شرح من أحمد. يرجى المحاولة مرة أخرى.",
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
        title: "تم استلام الشرح",
        description: "سارة قدمت شرحًا.",
      });
    } catch (error) {
      console.error("Error calling Sara:", error);
      toast({
        variant: "destructive",
        title: "خطأ في الاتصال بسارة",
        description: "فشل الحصول على شرح من سارة. يرجى المحاولة مرة أخرى.",
      });
      setCallState("error");
    }
  };

  const endCall = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechRecognitionRef.current && isListening) {
      speechRecognitionRef.current.abort();
      setIsListening(false);
    }
    setCallState("idle");
    setExplanation(null);
    if (selectedTeacher === "Ahmed") ahmedForm.reset();
    if (selectedTeacher === "Sara") saraForm.reset();
  };

  const toggleMute = () => {
    setIsMuted(prevMuted => {
      const newMutedState = !prevMuted;
      if (newMutedState && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return newMutedState;
    });
  };

  const teacherDetails = {
    Ahmed: {
      name: "أحمد",
      avatarSrc: "https://placehold.co/128x128.png",
      avatarHint: "man portrait",
      description: "معلم ذكاء اصطناعي يقدم شروحات باللغة العربية لقواعد اللغة الإنجليزية.",
      onSubmit: handleAhmedSubmit,
    },
    Sara: {
      name: "سارة",
      avatarSrc: "https://placehold.co/128x128.png",
      avatarHint: "woman portrait",
      description: "معلمة ذكاء اصطناعي تصمم شروحات باللغة العربية لقواعد اللغة الإنجليزية لتناسب مستوى إتقانك.",
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
            className="absolute top-4 rtl:left-4 ltr:right-4 text-muted-foreground hover:text-primary"
            aria-label={isMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}
          >
            {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </Button>
      </CardHeader>

      <Tabs value={selectedTeacher} onValueChange={(value) => setSelectedTeacher(value as Teacher)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-none h-auto">
          <TabsTrigger value="Ahmed" className="py-4 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-none">
            <User className="ms-2 h-5 w-5" /> أحمد
          </TabsTrigger>
          <TabsTrigger value="Sara" className="py-4 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-none">
            <User className="ms-2 h-5 w-5" /> سارة
          </TabsTrigger>
        </TabsList>

        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSubmit(currentTeacherInfo.onSubmit as SubmitHandler<any>)} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="englishGrammarConcept" className="text-md font-medium">مفهوم قواعد اللغة الإنجليزية</Label>
                {speechRecognitionSupported && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={toggleListening}
                    className={`p-2 h-8 w-8 ${isListening ? 'border-destructive text-destructive' : 'border-primary text-primary'}`}
                    disabled={callState === "calling" || isSubmitting || !speechRecognitionSupported}
                    aria-label={isListening ? "أوقف الاستماع" : "ابدأ الاستماع"}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              <Textarea
                id="englishGrammarConcept"
                placeholder={isListening ? "جاري الاستماع..." : "مثال: المضارع التام، الجمل الشرطية"}
                {...register("englishGrammarConcept")}
                className={`mt-1 text-base bg-background focus:ring-2 focus:ring-primary ${errors.englishGrammarConcept ? 'border-destructive focus:ring-destructive' : 'border-border'}`}
                rows={3}
                disabled={callState === "calling" || isSubmitting || isListening}
              />
              {errors.englishGrammarConcept && <p className="text-sm text-destructive mt-1">{errors.englishGrammarConcept.message}</p>}
              {!speechRecognitionSupported && (
                 <p className="text-xs text-muted-foreground mt-1">الإدخال الصوتي غير مدعوم في متصفحك.</p>
              )}
            </div>

            {selectedTeacher === "Sara" && (
              <div>
                <Label htmlFor="userLanguageProficiency" className="text-md font-medium">مستوى إتقانك للغة</Label>
                <Input
                  id="userLanguageProficiency"
                  placeholder="مثال: مبتدئ، متوسط، متقدم في اللغة الإنجليزية"
                  {...register("userLanguageProficiency")}
                  className={`mt-2 text-base bg-background focus:ring-2 focus:ring-primary ${errors.userLanguageProficiency ? 'border-destructive focus:ring-destructive' : 'border-border'}`}
                  disabled={callState === "calling" || isSubmitting}
                />
                {errors.userLanguageProficiency && <p className="text-sm text-destructive mt-1">{errors.userLanguageProficiency.message}</p>}
              </div>
            )}
            
            <div className="pt-2">
            {callState === "idle" || callState === "error" ? (
              <Button type="submit" className="w-full py-3 text-lg bg-accent hover:bg-accent/90 text-accent-foreground rounded-md shadow-md transition-transform hover:scale-105" disabled={isSubmitting || isListening}>
                <Mic className="ms-2 h-5 w-5" /> ابدأ المكالمة
              </Button>
            ) : callState === "calling" ? (
              <Button className="w-full py-3 text-lg bg-accent/80 rounded-md" disabled>
                <Loader2 className="ms-2 h-5 w-5 animate-spin" /> جاري الاتصال بـ {currentTeacherInfo.name}...
              </Button>
            ) : ( // callState === "active"
              <Button type="button" onClick={endCall} variant="outline" className="w-full py-3 text-lg border-primary text-primary hover:bg-primary/10 rounded-md shadow-sm transition-transform hover:scale-105">
                <PhoneOff className="ms-2 h-5 w-5" /> إنهاء المكالمة
              </Button>
            )}
            </div>
          </form>

          {callState === "active" && explanation && (
            <div className="mt-6 p-6 bg-secondary/30 rounded-lg shadow-inner border border-border">
              <h3 className="text-xl font-semibold mb-3 text-primary flex items-center">
                <MessageCircle className="ms-2 h-6 w-6" /> شرح {currentTeacherInfo.name}:
              </h3>
              <div className="text-foreground whitespace-pre-wrap text-base leading-relaxed p-2 bg-background rounded" style={{ textAlign: 'right', direction: 'rtl' }}>{explanation}</div>
            </div>
          )}
          {callState === "error" && (
             <div className="mt-6 p-4 bg-destructive/10 text-destructive rounded-lg shadow-inner border border-destructive/30 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold">فشل الاتصال</h3>
                <p className="text-sm">تعذر الاتصال بـ {currentTeacherInfo.name}. يرجى المحاولة مرة أخرى.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}
