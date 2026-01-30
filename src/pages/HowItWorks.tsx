import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Search,
  Eye,
  CalendarCheck,
  PartyPopper,
  ShieldCheck,
  MapPin,
  Plus,
  Share2,
  Music,
  Scissors,
  Briefcase,
  Mountain,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: Search,
    title: 'Browse',
    desc: 'Search venues fast and filter by what you want.',
  },
  {
    number: 2,
    icon: CalendarCheck,
    title: 'Book',
    desc: 'Pick a time, confirm details, and pay with QPay or card.',
  },
  {
    number: 3,
    icon: PartyPopper,
    title: 'Go',
    desc: 'Show your booking confirmation and enjoy your night.',
  },
];

const planSteps = [
  { icon: MapPin, text: 'Pick your first venue' },
  { icon: Plus, text: 'Add next stops' },
  { icon: Share2, text: 'Share the plan' },
];

const pillars = [
  {
    icon: Music,
    title: 'Tap Into the Night',
    desc: 'Entertainment venue discovery and booking.',
    status: 'LIVE / MVP',
    isLive: true,
  },
  {
    icon: Scissors,
    title: 'Tap Into Services',
    desc: 'Book service venues like salons, massages, car washes.',
    status: 'COMING SOON',
    isLive: false,
  },
  {
    icon: Briefcase,
    title: 'Tap Into Work',
    desc: 'Workspace booking + networking through FEAT.',
    status: 'COMING SOON',
    isLive: false,
  },
  {
    icon: Mountain,
    title: 'Tap Into Mongolia',
    desc: 'Discover landmarks, learn history, plan travel.',
    status: 'COMING SOON',
    isLive: false,
  },
];

const faqItems = [
  {
    question: 'Do I need an account?',
    answer: 'For the MVP, booking can be simple. If accounts exist on the site, keep the current flow.',
  },
  {
    question: 'How do I pay?',
    answer: 'QPay or card, depending on what the venue supports.',
  },
  {
    question: 'What if a venue is full?',
    answer: "Availability is shown before you confirm. If unavailable, pick another time or venue.",
  },
  {
    question: 'Is TAPN only for Ulaanbaatar?',
    answer: 'Ulaanbaatar first, then all Mongolia, then global expansion.',
  },
];

export default function HowItWorks() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="container relative z-10 text-center py-20">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            How <span className="text-gradient">TAPN</span> Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Discover, compare, and book in minutes. Built for Mongolia. Ready for the world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/venues">
              <Button className="gradient-primary rounded-full px-8">
                Explore Venues
              </Button>
            </Link>
            <Link to="/partner">
              <Button variant="outline" className="rounded-full border-border bg-secondary/50 hover:bg-secondary text-foreground px-8">
                Contact / Support
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Step-by-Step Section */}
      <section className="py-24 bg-background">
        <div className="container">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4 text-gradient">
            Tap Into the Night
          </h2>
          <p className="text-center text-muted-foreground mb-16">
            Three simple steps to your perfect night out
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map(({ number, icon: Icon, title, desc }) => (
              <div key={number} className="relative card-dark rounded-2xl p-6 text-center">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-sm font-semibold text-primary bg-background">
                  {number}
                </div>
                <div className="w-14 h-14 rounded-2xl gradient-icon flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2 text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-8 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Admin-verified venues for reliability.</span>
          </div>
        </div>
      </section>

      {/* Plan a Night Section */}
      <section className="py-24 bg-secondary/20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                <span className="text-foreground">Plan a </span>
                <span className="text-gradient">Night</span>
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Build a full night timeline. Choose multiple venues. Keep it organized.
              </p>
              <div className="flex flex-wrap gap-4 mb-8">
                {planSteps.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 card-dark rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-lg gradient-icon flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-foreground text-sm font-medium">{text}</span>
                  </div>
                ))}
              </div>
              <Link to="/plan-a-night">
                <Button className="gradient-primary rounded-full px-8">
                  Create a Plan <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="relative flex justify-center">
              <div className="relative w-full max-w-sm">
                <div className="card-dark rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="w-10 h-10 rounded-lg gradient-icon flex items-center justify-center">
                      <Music className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">8:00 PM - Karaoke Bar</p>
                      <p className="text-xs text-muted-foreground">First stop</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
                    <div className="w-10 h-10 rounded-lg gradient-icon flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">10:30 PM - Lounge</p>
                      <p className="text-xs text-muted-foreground">Second stop</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
                    <div className="w-10 h-10 rounded-lg gradient-icon flex items-center justify-center">
                      <PartyPopper className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">12:00 AM - Club</p>
                      <p className="text-xs text-muted-foreground">Final destination</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TAPN Pillars Section */}
      <section className="py-24 bg-background">
        <div className="container">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-16 text-gradient">
            TAPN Pillars
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map(({ icon: Icon, title, desc, status, isLive }) => (
  <div
    key={title}
    className={`relative card-dark rounded-2xl p-6 ${
      !isLive ? 'overflow-hidden' : ''
    }`}
  >
    {/* Status badge – always visible */}
    <span
      className={`absolute top-4 right-4 z-10 text-xs font-semibold px-3 py-1 rounded-full ${
        isLive
          ? 'bg-primary/20 text-primary'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {status}
    </span>

    {/* Blurred content when NOT live */}
    <div className={`${!isLive ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 rounded-xl gradient-icon flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
      </div>

      <h3 className="font-display font-semibold text-lg mb-2 text-foreground">
        {title}
      </h3>

      <p className="text-sm text-muted-foreground">
        {desc}
      </p>
    </div>

    {/* Optional dark glass overlay */}
    {!isLive && (
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
    )}
  </div>
))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-secondary/20">
        <div className="container max-w-3xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-16 text-gradient">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map(({ question, answer }, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="card-dark rounded-xl px-6 border-0"
              >
                <AccordionTrigger className="text-foreground hover:text-primary hover:no-underline">
                  {question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 gradient-partner">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-8">
            Ready to tap in?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/venues">
              <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-full px-8">
                Start Browsing
              </Button>
            </Link>
            <Link to="/partner">
              <Button 
                variant="outline" 
                className="rounded-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 px-8"
              >
                List a Venue / Partner <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
