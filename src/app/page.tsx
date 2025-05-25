
import { CallInterface } from '@/components/call-interface';
import { LinguaLearnLogo } from '@/components/icons/lingua-learn-logo';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background p-4 sm:p-8 pt-12 sm:pt-16">
      <header className="mb-10 text-center">
        <LinguaLearnLogo className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-primary mb-4 animate-pulse" />
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">لينجوا ليرن الثنائي الذكاء الاصطناعي</h1>
        <p className="text-lg sm:text-xl text-muted-foreground mt-2">
          معلموك الذكاء الاصطناعي لإتقان قواعد اللغة الإنجليزية، مع شرح باللغة العربية.
        </p>
      </header>
      <CallInterface />
       <footer className="mt-8 sm:mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} لينجوا ليرن الثنائي الذكاء الاصطناعي. مقدم من سبيد أوف ماستري.</p>
      </footer>
    </div>
  );
}
