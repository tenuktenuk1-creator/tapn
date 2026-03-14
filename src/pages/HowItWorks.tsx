import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
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
  PartyPopper,
} from 'lucide-react';
import { HOW_IT_WORKS_STEPS } from '@/lib/howItWorksSteps';
import { ContainerScroll } from '@/components/how-it-works/ContainerScroll';
import { TapnProductMock } from '@/components/how-it-works/TapnProductMock';

// ─── static data ───────────────────────────────────────────────────────────

const planSteps = [
  { icon: MapPin,  text: 'Pick your first venue' },
  { icon: Plus,    text: 'Add next stops'         },
  { icon: Share2,  text: 'Share the plan'         },
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
    answer:
      "You can browse venues without an account. To make a booking, you'll need to provide your contact info — creating a free account lets you track all your bookings in one place.",
  },
  {
    question: 'How do I pay?',
    answer: 'QPay or card, depending on what the venue supports.',
  },
  {
    question: 'What if a venue is full?',
    answer: 'Availability is shown before you confirm. If unavailable, pick another time or venue.',
  },
  {
    question: 'Is TAPN only for Ulaanbaatar?',
    answer: 'Ulaanbaatar first, then all Mongolia, then global expansion.',
  },
];

// ─── animation helpers ─────────────────────────────────────────────────────

/** Fade-up reveal for any element entering the viewport once. */
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay },
  }),
};

const viewportOnce = { once: true, margin: '-60px' };

// ─── component ─────────────────────────────────────────────────────────────

export default function HowItWorks() {
  return (
    <Layout>
      {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[52vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />

        {/* Extra soft center glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 100%, hsl(322 100% 60% / 0.12) 0%, transparent 65%)',
          }}
        />

        <div className="container relative z-10 text-center py-24">
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground"
          >
            How <span className="text-gradient">TAPN</span> Works
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.12 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto mb-10"
          >
            Discover, compare, and book in minutes.
            <br className="hidden sm:block" /> Built for Mongolia. Ready for the world.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.22 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/venues">
              <Button className="gradient-primary rounded-full px-8">Explore Venues</Button>
            </Link>
            <a href="mailto:support@tapn.mn">
              <Button
                variant="outline"
                className="rounded-full border-border bg-secondary/50 hover:bg-secondary text-foreground px-8"
              >
                Contact / Support
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── 2. Container Scroll Showcase ─────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-background overflow-hidden">
        <div className="container">
          <ContainerScroll
            titleComponent={
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  The Full Experience
                </p>
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  From plan to party{' '}
                  <span className="text-gradient">in three steps</span>
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto text-base md:text-lg leading-relaxed">
                  One platform. Browse venues, lock in a time, build your night.
                </p>
              </div>
            }
          >
            {/* Desktop mock (hidden on mobile — too narrow) */}
            <div className="hidden md:block">
              <TapnProductMock />
            </div>

            {/* Mobile: simplified 3-step visual */}
            <div className="md:hidden space-y-4">
              {HOW_IT_WORKS_STEPS.map(({ number, icon: Icon, title, desc }) => (
                <div
                  key={number}
                  className="relative card-dark rounded-2xl p-5 flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl gradient-icon flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Step {number}</p>
                    <h3 className="font-display font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </ContainerScroll>
        </div>
      </section>

      {/* ── Hook line — between showcase and step cards ────────────────────── */}
      <div className="py-10 bg-background text-center">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="font-display text-lg md:text-xl font-semibold tracking-tight"
          style={{
            background: 'linear-gradient(90deg, hsl(240 5% 55%) 0%, hsl(0 0% 75%) 50%, hsl(240 5% 55%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Your night. Organized in seconds.
        </motion.p>
      </div>

      {/* ── 3. Three-Step Cards ───────────────────────────────────────────── */}
      <section className="py-24 bg-secondary/20">
        <div className="container">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-gradient">
              Tap Into the Night
            </h2>
            <p className="text-muted-foreground">Three simple steps to your perfect night out</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS_STEPS.map(({ number, icon: Icon, title, desc }, i) => (
              <motion.div
                key={number}
                variants={fadeUp}
                custom={i * 0.1}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                className="relative card-dark rounded-2xl p-6 text-center"
              >
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-sm font-semibold text-primary bg-background">
                  {number}
                </div>
                <div className="w-14 h-14 rounded-2xl gradient-icon flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2 text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            variants={fadeUp}
            custom={0.3}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="flex items-center justify-center gap-2 mt-10 text-sm text-muted-foreground"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Admin-verified venues for reliability.</span>
          </motion.div>
        </div>
      </section>

      {/* ── 4. Plan a Night ───────────────────────────────────────────────── */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left copy */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
            >
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
            </motion.div>

            {/* Right timeline card */}
            <motion.div
              variants={fadeUp}
              custom={0.1}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              className="relative flex justify-center"
            >
              {/* Soft glow behind card */}
              <div
                className="absolute inset-0 pointer-events-none rounded-3xl"
                style={{
                  background:
                    'radial-gradient(ellipse 80% 60% at 50% 50%, hsl(280 85% 55% / 0.12) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
              />
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 5. TAPN Pillars ───────────────────────────────────────────────── */}
      <section className="py-24 bg-secondary/20">
        <div className="container">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-16 text-gradient"
          >
            TAPN Pillars
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map(({ icon: Icon, title, desc, status, isLive }, i) => (
              <motion.div
                key={title}
                variants={fadeUp}
                custom={i * 0.08}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                className={`relative card-dark rounded-2xl p-6 ${!isLive ? 'overflow-hidden' : ''}`}
              >
                {/* Status badge */}
                <span
                  className={`absolute top-4 right-4 z-10 text-xs font-semibold px-3 py-1 rounded-full ${
                    isLive
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {status}
                </span>

                {/* Blurred content for coming-soon pillars */}
                <div className={`${!isLive ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-xl gradient-icon flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2 text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>

                {!isLive && (
                  <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. FAQ ───────────────────────────────────────────────────────── */}
      <section className="py-24 bg-background">
        <div className="container max-w-3xl">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-16 text-gradient"
          >
            Frequently Asked Questions
          </motion.h2>

          <motion.div
            variants={fadeUp}
            custom={0.1}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
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
                  <AccordionContent className="text-muted-foreground">{answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* ── 7. Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 gradient-partner">
        <div className="container text-center">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-8"
          >
            Ready to tap in?
          </motion.h2>
          <motion.div
            variants={fadeUp}
            custom={0.1}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
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
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
