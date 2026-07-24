import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, HelpCircle, ChevronDown, Award, Shield, Clock, Eye } from 'lucide-react';
import atgLogo from '../assets/atg_apply.png';
import atgBackPng from '../assets/atg back.png';

import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/ui/LanguageSelector';

const RISING_BLUE_PARTICLES = Array.from({ length: 48 }).map((_, i) => ({
  id: i,
  left: `${(i * 2.1 + (i % 9) * 3.7) % 100}%`,
  size: `${(i % 3) * 2.5 + 3}px`,
  duration: `${6.5 + (i % 7) * 1.8}s`,
  delay: `${(i % 12) * 0.5}s`,
  opacity: 0.2 + (i % 5) * 0.04,
}));

const LandingPage = () => {
  const { t } = useTranslation();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-100 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-between items-center py-6 px-8 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-md text-white sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 font-extrabold text-2xl md:text-3xl text-white group">
            <img src={atgLogo} alt="ATG Apply Logo" className="h-12 w-auto object-contain transition-transform duration-500 group-hover:scale-110" />
            <span className="tracking-tight text-white transition-all duration-300 group-hover:opacity-90">ATG Apply</span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm text-slate-300 font-medium ml-12">
            <Link to="/" className="text-white font-semibold border-b-2 border-blue-500 pb-1">{t('nav.home')}</Link>
            <Link to="/how-it-works" className="hover:text-white transition-colors pb-1">{t('nav.howItWorks')}</Link>
            <Link to="/pricing" className="hover:text-white transition-colors pb-1">{t('nav.pricing')}</Link>
            <a href="mailto:support@atgconcordia.com" className="hover:text-white transition-colors pb-1">{t('nav.contact')}</a>
            <Link to="/privacy" className="hover:text-white transition-colors pb-1">{t('nav.privacy')}</Link>
            <Link to="/terms" className="hover:text-white transition-colors pb-1">{t('nav.terms')}</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <LanguageSelector />
          <Link to="/login" className="px-5 py-2 border border-slate-700 rounded text-slate-200 hover:bg-slate-800 transition-colors">{t('nav.signIn')}</Link>
          <Link to="/register" className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors hidden md:block hover:shadow-md">
            {t('nav.startFree')}
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section with atg back.png background */}
        <section className="relative overflow-hidden bg-[#0f172a] text-white py-28 border-b border-slate-800/80">
          {/* Main atg back.png background image */}
          <div 
            className="absolute inset-0 opacity-45 pointer-events-none bg-cover bg-center bg-no-repeat z-0"
            style={{ backgroundImage: `url("${atgBackPng}")` }}
          />

          {/* Blue Rising Particles (Bottom to Top) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            {RISING_BLUE_PARTICLES.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full bg-gradient-to-tr from-blue-400 via-blue-300 to-white shadow-[0_0_12px_#3b82f6,0_0_3px_#ffffff] border border-blue-200/60 animate-particles-rise"
                style={{
                  left: p.left,
                  width: p.size,
                  height: p.size,
                  animationDuration: p.duration,
                  animationDelay: p.delay,
                  opacity: p.opacity,
                }}
              />
            ))}
          </div>

          {/* Very Slow Spreadable Arrow Lightning Sweeping Animation (Ash body + Thinner Neon Blue edge stroke, low opacity) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 flex items-center opacity-40">
            <div className="animate-arrow-lightning-slow transform transition-transform">
              <svg className="w-[850px] h-[850px] lg:w-[1250px] lg:h-[1250px] filter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" viewBox="0 0 100 100" fill="none">
                <defs>
                  <linearGradient id="ashBodyGradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#0f172a" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0.35" />
                  </linearGradient>
                  <linearGradient id="blueGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.7" />
                  </linearGradient>
                </defs>

                {/* Ash Chevron Body */}
                <path 
                  d="M 5 5 L 43 43 Q 48 48 43 53 L 5 91 L 28 91 L 68 51 Q 73 46 68 41 L 28 5 Z" 
                  fill="url(#ashBodyGradBlue)" 
                />

                {/* Glowing Neon Blue Stroke Line along inner edge */}
                <path 
                  d="M 5 5 L 43 43 Q 48 48 43 53 L 5 91" 
                  stroke="url(#blueGlowGrad)" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  fill="none" 
                  className="drop-shadow-[0_0_6px_#3b82f6]"
                />
              </svg>
            </div>
          </div>

          {/* Broad Spreadable Blue Glow Aura */}
          <div className="absolute right-0 bottom-0 w-[650px] h-[650px] bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-spreadable-pulse z-0" />

          {/* Soft gradient divider */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/95 via-[#0f172a]/20 to-[#0f172a]/95 pointer-events-none z-0 lg:block hidden"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/95 via-[#0f172a]/20 to-[#0f172a]/95 pointer-events-none z-0 lg:hidden block"></div>

          {/* Glowing accent behind content */}
          <div className="absolute left-1/4 top-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none z-0"></div>

          <div className="max-w-[1720px] mx-auto px-6 lg:px-12 relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
            {/* Hero Text - Original Scale, Pushed to Far Left */}
            <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 animate-fade-in-up relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 rounded-full mb-8 hover:bg-blue-500/20 transition-colors cursor-pointer">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Human-managed · Research-led
              </div>

              {/* Giant Prominent branding display in Hero */}
              <div className="flex items-center gap-4 mb-8 cursor-pointer origin-left group">
                <img src={atgLogo} alt="ATG Apply Logo" className="h-16 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300" />
                <div>
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">ATG Apply</span>
                  <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">Premium Application Service</span>
                </div>
              </div>

              <h1 className="text-3xl lg:text-[2.8rem] font-serif text-white mb-6 leading-[1.2] tracking-tight">
                Your personal job<br/>application team.
              </h1>
              <p className="text-base text-slate-300 mb-8 leading-relaxed">
                We help students, graduates and busy professionals find suitable jobs, prepare stronger applications, and apply with confidence. Our trained team researches roles, checks your fit, tailors your CV and motivation letter, and submits on your behalf.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
                <Link to="/register" className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 text-center text-sm">
                  Start free — 2 applications
                </Link>
                <Link to="/how-it-works" className="w-full sm:w-auto px-6 py-3.5 border border-slate-700 text-slate-200 rounded-lg font-medium hover:bg-slate-800 transition-all text-center text-sm">
                  See how it works
                </Link>
              </div>
              <p className="text-xs text-slate-400">No card required. Pay only when you are satisfied.</p>
            </div>

            {/* Dashboard Preview Card - Original Scale, Pushed further Right */}
            <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 relative animate-fade-in-up animation-delay-200 transform lg:translate-x-14 xl:translate-x-20">
              <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative z-10">
                <div className="flex justify-between items-center mb-6 text-sm text-slate-400">
                  <span>Your dashboard · this week</span>
                  <span className="font-medium text-white">Nandini R.</span>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-[#0f172a]/90 p-4 rounded-xl shadow-sm border border-slate-700/80 flex items-center justify-between hover:bg-[#0f172a] transition-colors duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
                        88%
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm sm:text-base">Senior UX Designer · MAS Holdings</h4>
                        <p className="text-xs text-slate-400">High fit · Applied · proof saved</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-full">Applied</span>
                  </div>
                  
                  <div className="bg-[#0f172a]/90 p-4 rounded-xl shadow-sm border border-slate-700/80 flex items-center justify-between hover:bg-[#0f172a] transition-colors duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-lg">
                        82%
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm sm:text-base">Product Designer · WSO2</h4>
                        <p className="text-xs text-slate-400">Interview scheduled 29 Jun</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold rounded-full font-sans">Interview</span>
                  </div>

                  <div className="bg-[#0f172a]/50 p-4 rounded-xl shadow-inner border border-slate-700 border-dashed flex items-center justify-between hover:bg-[#0f172a] transition-colors duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg">
                        58%
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200 text-sm sm:text-base">UX Researcher · Dialog Axiata</h4>
                        <p className="text-xs text-slate-400">Nothing is submitted until you approve it.</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-slate-700 text-slate-300 text-xs font-semibold rounded-full whitespace-nowrap">Pending review</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-[#0b0f19] py-20 text-white relative overflow-hidden border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10">
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-5xl font-black text-blue-400 mb-2">2 free</div>
              <div className="text-sm text-slate-400 font-medium">applications to start</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-5xl font-black text-emerald-400 mb-2">100%</div>
              <div className="text-sm text-slate-400 font-medium">human-prepared & checked</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-5xl font-black text-purple-400 mb-2">3</div>
              <div className="text-sm text-slate-400 font-medium">working-day match SLA</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-5xl font-black text-amber-400 mb-2">Proof</div>
              <div className="text-sm text-slate-400 font-medium">of every submission</div>
            </div>
          </div>
        </section>

        {/* Premium Benefits Section */}
        <section className="bg-[#1e293b] py-28 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">Why Professionals Choose ATG Apply</h2>
              <p className="text-slate-300 text-lg">We bridge the gap between quality job searches and busy schedules by offering a service that feels like your own private job application squad.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-8 rounded-2xl bg-slate-800/90 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Tailored Alignment</h3>
                <p className="text-sm text-slate-400 leading-relaxed">We customize your CV and cover letter specifically to highlight matching strengths for every individual vacancy.</p>
              </div>

              <div className="p-8 rounded-2xl bg-slate-800/90 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Total Transparency</h3>
                <p className="text-sm text-slate-400 leading-relaxed">See live updates and download proof screenshots or receipts of every single application directly in your portal.</p>
              </div>

              <div className="p-8 rounded-2xl bg-slate-800/90 border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">100% Quality Checked</h3>
                <p className="text-sm text-slate-400 leading-relaxed">No bot spamming. Trained operators check input parameters, instructions, and file uploads prior to submission.</p>
              </div>

              <div className="p-8 rounded-2xl bg-slate-800/90 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Unrivaled Efficiency</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Save up to 15 hours each week. Spend your energy preparing for actual interviews instead of filling out duplicate forms.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-7xl mx-auto px-8 py-28 border-b border-slate-800/80">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-3 text-center">How it works</h2>
          <p className="text-slate-400 mb-16 text-center text-lg">Four steps. Real people at every one.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { num: "01", title: "Tell us about you", text: "Complete a guided intake — experience, target roles, documents. About 12 minutes." },
              { num: "02", title: "We research & score", text: "Your team finds roles and rates each one with a clear fit score and an honest reason." },
              { num: "03", title: "We apply directly", text: "Trained operators apply directly on your behalf, tailoring documents and submitting your application." },
              { num: "04", title: "We upload proof & evidence", text: "After applying, operators mark your application complete and upload proof documents and screenshots to your dashboard." }
            ].map((step, idx) => (
              <div key={idx} className="bg-slate-800/90 border border-slate-700 shadow-xl p-8 rounded-2xl hover:border-blue-500/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl font-black text-blue-400 mb-6">{step.num}</div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Not a bot */}
        <section className="bg-[#1e293b] py-28 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="pr-8">
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">Not a bot. A team.</h2>
              <p className="text-slate-300 mb-8 leading-relaxed text-lg">
                We don't mass auto-apply or scrape job boards and fire off generic applications. Trained specialists research roles, tailor each application, and run a quality check before anything is submitted in your name.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4 text-slate-200 font-semibold hover:translate-x-1 transition-transform cursor-pointer">
                  <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0" /> Every application reviewed by a person before it's sent
                </li>
                <li className="flex items-center gap-4 text-slate-200 font-semibold hover:translate-x-1 transition-transform cursor-pointer">
                  <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0" /> Sensitive documents never sent to external AI tools
                </li>
              </ul>
            </div>
            
            <div className="bg-[#0f172a] text-white p-12 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden group hover:border-blue-500/40 transition-all duration-500">
              <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
              <p className="text-2xl font-serif mb-10 leading-relaxed text-slate-200 relative z-10">
                "I had two interviews in three weeks. They handled the applications I never had time to finish — and showed me proof of every single one."
              </p>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xl shadow-inner border border-white/10 text-white">
                  ND
                </div>
                <div>
                  <div className="font-bold text-white text-lg">Nandini R.</div>
                  <div className="text-blue-400 text-sm mt-1">Senior UX Designer · Colombo</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stateful FAQ Accordion Section */}
        <section className="py-28 bg-[#0f172a] border-b border-slate-800/80">
          <div className="max-w-4xl mx-auto px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h2 className="text-4xl font-black text-white mb-3">Frequently Asked Questions</h2>
              <p className="text-slate-400 text-lg">Everything you need to know about how ATG Apply handles your application process.</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "How does the 2-free-applications trial work?",
                  a: "Once you create your profile and set up your details, you can submit up to two jobs or scholarships. We will review them, match your profile, customize your files, apply, and post proof to your dashboard for free. No credit card is required."
                },
                {
                  q: "Are these applications automated by bots or AI?",
                  a: "Absolutely not. We do not use automated scrapers or bulk-applying scripts. Every vacancy is researched and assessed by a trained team, and each application form is filled out manually by a real person."
                },
                {
                  q: "How are my applications processed and submitted?",
                  a: "Our trained operators apply directly on your behalf. Once the application is submitted, the operator uploads full evidence including receipts, confirmation files, and screenshots to your dashboard."
                },
                {
                  q: "What proof of submission do you provide?",
                  a: "For every completed application, our team uploads direct proof to your dashboard. This includes confirmation screenshots, email copies, or PDF receipts from the job boards or target portals."
                }
              ].map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div 
                    key={index} 
                    className="bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden shadow-xl hover:border-slate-600 transition-all duration-300"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="w-full text-left px-6 py-5 flex justify-between items-center gap-4 focus:outline-none cursor-pointer"
                    >
                      <span className="font-semibold text-white text-lg">{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-blue-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div 
                      className={`transition-all duration-300 ease-in-out ${
                        isOpen ? 'max-h-48 border-t border-slate-700 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="px-6 py-5 text-sm text-slate-300 leading-relaxed bg-[#0f172a]/60">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-36 text-center bg-[#0b0f19] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-3xl mx-auto px-8">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">Start with two free applications.</h2>
            <p className="text-slate-400 mb-12 text-xl">Prove the quality first. Choose a package only when you're satisfied.</p>
            <Link to="/register" className="inline-block px-10 py-5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/30 text-xl">
              Create your account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#080c14] text-slate-400 py-20 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
            <div className="col-span-1 pr-8">
              {/* Branding in footer */}
              <Link to="/" className="flex items-center gap-3 font-black text-3xl mb-6 text-white hover:text-blue-400 transition-colors group">
                <img src={atgLogo} alt="ATG Apply Logo" className="h-16 w-auto object-contain transition-transform duration-500 group-hover:scale-110" />
                <span className="tracking-tight">ATG Apply</span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed">
                Human-managed job applications. Research-led matching, prepared and submitted by a trained team.
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link to="/how-it-works" className="hover:text-white transition-colors">How it works</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Start free</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><a href="mailto:support@atgconcordia.com" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-900 text-xs text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>© 2026 ATG Concordia (Pvt) Ltd · Colombo, Sri Lanka</div>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-slate-300">Privacy</Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-slate-300">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
