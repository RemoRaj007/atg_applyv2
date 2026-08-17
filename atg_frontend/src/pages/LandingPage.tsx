import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageContent } from '../hooks/useSiteContent';
import { Link } from 'react-router-dom';
import { CheckCircle, HelpCircle, ChevronDown, Award, Shield, Clock, Eye } from 'lucide-react';

import MarketingHeader from '../components/layout/MarketingHeader';
import AtgWordmark from '../components/ui/AtgWordmark';

const LandingPage = () => {
  const { t } = useTranslation();

  // Fallback copy: what renders when an administrator has not edited the page,
  // or the content request fails. These were English string literals, which is
  // why the landing page stayed English in every language — it is the one page
  // that opted out of i18n entirely in favour of the CMS overlay. An edited
  // value still wins; an unedited one now follows the language selector.
  const content = usePageContent('landing', {
    'hero.title': t('hero.title', { defaultValue: 'Your personal job\napplication team.' }),
    'hero.subtitle': t('hero.subtitle', {
      defaultValue:
        'We help students, graduates and busy professionals find suitable jobs, prepare stronger applications, and apply with confidence. Our trained team researches roles, checks your fit, tailors your CV and motivation letter, and submits on your behalf.',
    }),
  });

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1D1D1F]">
      {/* Header */}
      <MarketingHeader />

      <main className="flex-grow">
        {/* Hero Section with atg back.png background */}
        {/* ── Opening ──
          * Was: a full-bleed ATG watermark, a rising-particle field, a blurred
          * glow orb, three overlaying gradient scrims, the boxed-"A" logo, and
          * an "Example dashboard" card showing invented candidates (Senior UX
          * Designer, 88% fit, "Applied"). The mockup is gone with the rest:
          * fabricated people and outcomes should not be permanent furniture on
          * the page that asks someone to trust the service with their career.
          */}
        <section className="border-b border-[#D2D2D7] py-24">
          <div className="max-w-[720px] mx-auto px-6 lg:px-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F05A28] mb-6">
              {t('hero.eyebrow', { defaultValue: 'One profile. Every opportunity.' })}
            </p>

            {/* Copy comes from Site Content when an admin has edited it. The
                values passed to usePageContent are the shipped fallback, and
                they are t() lookups now rather than English literals, so an
                unedited page still follows the language selector. */}
            <h1 className="text-4xl lg:text-5xl font-semibold text-[#1D1D1F] mb-6 leading-tight tracking-tight whitespace-pre-line">
              {content('hero.title')}
            </h1>
            <p className="text-lg text-[#6E6E73] mb-10 leading-relaxed">
              {content('hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
              <Link
                to="/register"
                className="w-full sm:w-auto min-h-11 px-6 py-3 bg-[#0066CC] text-white rounded-lg font-medium hover:bg-[#0055AA] transition-colors text-center inline-flex items-center justify-center"
              >
                {t('hero.primaryCta', { defaultValue: 'Create your profile' })}
              </Link>
              <Link
                to="/how-it-works"
                className="w-full sm:w-auto min-h-11 px-6 py-3 border border-[#D2D2D7] text-[#1D1D1F] rounded-lg font-medium hover:bg-[#F5F5F7] transition-colors text-center inline-flex items-center justify-center"
              >
                {t('hero.secondaryCta', { defaultValue: 'See how it works' })}
              </Link>
            </div>
            <p className="text-sm text-[#6E6E73]">
              {t('hero.reassurance', { defaultValue: 'No card required. Pay only when you are satisfied.' })}
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-[#F5F5F7] py-20 text-[#1D1D1F] relative overflow-hidden border-b border-[#D2D2D7]">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10">
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-5xl font-black text-[#0066CC] mb-2">2 free</div>
              <div className="text-sm text-[#6E6E73] font-medium">applications to start</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-5xl font-black text-emerald-400 mb-2">100%</div>
              <div className="text-sm text-[#6E6E73] font-medium">human-prepared & checked</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-5xl font-black text-purple-400 mb-2">3</div>
              <div className="text-sm text-[#6E6E73] font-medium">working-day match SLA</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-5xl font-black text-amber-400 mb-2">Proof</div>
              <div className="text-sm text-[#6E6E73] font-medium">of every submission</div>
            </div>
          </div>
        </section>

        {/* Premium Benefits Section */}
        <section className="bg-[#F5F5F7] py-28 border-b border-[#D2D2D7]">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl lg:text-5xl font-black text-[#1D1D1F] mb-4">Why Professionals Choose ATG Apply</h2>
              <p className="text-[#6E6E73] text-lg">We bridge the gap between quality job searches and busy schedules by offering a service that feels like your own private job application squad.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-8 rounded-2xl bg-white border border-[#D2D2D7] hover:border-blue-500/50 hover:bg-[#F5F5F7] hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#0066CC] mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] mb-3">Tailored Alignment</h3>
                <p className="text-sm text-[#6E6E73] leading-relaxed">We customize your CV and cover letter specifically to highlight matching strengths for every individual vacancy.</p>
              </div>

              <div className="p-8 rounded-2xl bg-white border border-[#D2D2D7] hover:border-emerald-500/50 hover:bg-[#F5F5F7] hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] mb-3">Total Transparency</h3>
                <p className="text-sm text-[#6E6E73] leading-relaxed">See live updates and download proof screenshots or receipts of every single application directly in your portal.</p>
              </div>

              <div className="p-8 rounded-2xl bg-white border border-[#D2D2D7] hover:border-purple-500/50 hover:bg-[#F5F5F7] hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] mb-3">100% Quality Checked</h3>
                <p className="text-sm text-[#6E6E73] leading-relaxed">No bot spamming. Trained operators check input parameters, instructions, and file uploads prior to submission.</p>
              </div>

              <div className="p-8 rounded-2xl bg-white border border-[#D2D2D7] hover:border-amber-500/50 hover:bg-[#F5F5F7] hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] mb-3">Unrivaled Efficiency</h3>
                <p className="text-sm text-[#6E6E73] leading-relaxed">Save up to 15 hours each week. Spend your energy preparing for actual interviews instead of filling out duplicate forms.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-7xl mx-auto px-8 py-28 border-b border-[#D2D2D7]">
          <h2 className="text-4xl lg:text-5xl font-black text-[#1D1D1F] mb-3 text-center">How it works</h2>
          <p className="text-[#6E6E73] mb-16 text-center text-lg">Four steps. Real people at every one.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { num: "01", title: "Tell us about you", text: "Complete a guided intake — experience, target roles, documents. About 12 minutes." },
              { num: "02", title: "We research & score", text: "Your team finds roles and rates each one with a clear fit score and an honest reason." },
              { num: "03", title: "We apply directly", text: "Trained operators apply directly on your behalf, tailoring documents and submitting your application." },
              { num: "04", title: "We upload proof & evidence", text: "After applying, operators mark your application complete and upload proof documents and screenshots to your dashboard." }
            ].map((step, idx) => (
              <div key={idx} className="bg-white border border-[#D2D2D7] shadow-xl p-8 rounded-2xl hover:border-blue-500/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl font-black text-[#0066CC] mb-6">{step.num}</div>
                <h3 className="text-xl font-bold text-[#1D1D1F] mb-3">{step.title}</h3>
                <p className="text-sm text-[#6E6E73] leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Not a bot */}
        <section className="bg-[#F5F5F7] py-28 border-b border-[#D2D2D7]">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="pr-8">
              <h2 className="text-4xl lg:text-5xl font-black text-[#1D1D1F] mb-6">Not a bot. A team.</h2>
              <p className="text-[#6E6E73] mb-8 leading-relaxed text-lg">
                We don't mass auto-apply or scrape job boards and fire off generic applications. Trained specialists research roles, tailor each application, and run a quality check before anything is submitted in your name.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4 text-[#1D1D1F] font-semibold hover:translate-x-1 transition-transform cursor-pointer">
                  <CheckCircle className="w-6 h-6 text-[#0066CC] flex-shrink-0" /> Every application reviewed by a person before it's sent
                </li>
                <li className="flex items-center gap-4 text-[#1D1D1F] font-semibold hover:translate-x-1 transition-transform cursor-pointer">
                  <CheckCircle className="w-6 h-6 text-[#0066CC] flex-shrink-0" /> Sensitive documents never sent to external AI tools
                </li>
              </ul>
            </div>
            
            <div className="bg-white text-[#1D1D1F] p-12 rounded-3xl border border-[#D2D2D7] shadow-2xl relative overflow-hidden group hover:border-blue-500/40 transition-all duration-500">
              <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <p className="text-[#1D1D1F]">Confirmation email, application ID, or screenshot uploaded for every submission — nothing sent without your approval first.</p>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <p className="text-[#1D1D1F]">Every application prepared and submitted by a trained team member, never a bot or scraper.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stateful FAQ Accordion Section */}
        <section className="py-28 bg-white border-b border-[#D2D2D7]">
          <div className="max-w-4xl mx-auto px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 text-[#0066CC] border border-blue-500/20 mb-4">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h2 className="text-4xl font-black text-[#1D1D1F] mb-3">Frequently Asked Questions</h2>
              <p className="text-[#6E6E73] text-lg">Everything you need to know about how ATG Apply handles your application process.</p>
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
                    className="bg-white border border-[#D2D2D7] rounded-xl overflow-hidden shadow-xl hover:border-slate-600 transition-all duration-300"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="w-full text-left px-6 py-5 flex justify-between items-center gap-4 focus:outline-none cursor-pointer"
                    >
                      <span className="font-semibold text-[#1D1D1F] text-lg">{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-[#0066CC] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div 
                      className={`transition-all duration-300 ease-in-out ${
                        isOpen ? 'max-h-48 border-t border-[#D2D2D7] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="px-6 py-5 text-sm text-[#6E6E73] leading-relaxed bg-[#F5F5F7]">
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
        <section className="py-36 text-center bg-[#F5F5F7] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-3xl mx-auto px-8">
            <h2 className="text-4xl lg:text-5xl font-black text-[#1D1D1F] mb-6">Start with two free applications.</h2>
            <p className="text-[#6E6E73] mb-12 text-xl">Prove the quality first. Choose a package only when you're satisfied.</p>
            <Link to="/register" className="inline-block px-10 py-5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/30 text-xl">
              Create your account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#F5F5F7] text-[#6E6E73] py-20 border-t border-[#D2D2D7]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
            <div className="col-span-1 pr-8">
              {/* Branding in footer */}
              <Link to="/" className="inline-flex mb-6">
                <AtgWordmark size="md" />
              </Link>
              <p className="text-[#6E6E73] text-sm leading-relaxed">
                Human-managed job applications. Research-led matching, prepared and submitted by a trained team.
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-[#0066CC] uppercase tracking-wider mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-[#6E6E73]">
                <li><Link to="/how-it-works" className="hover:text-[#1D1D1F] transition-colors">How it works</Link></li>
                <li><Link to="/pricing" className="hover:text-[#1D1D1F] transition-colors">Pricing</Link></li>
                <li><Link to="/pricing" className="hover:text-[#1D1D1F] transition-colors">Start free</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#0066CC] uppercase tracking-wider mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-[#6E6E73]">
                <li><Link to="/contact" className="hover:text-[#1D1D1F] transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#0066CC] uppercase tracking-wider mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-[#6E6E73]">
                <li><Link to="/privacy" className="hover:text-[#1D1D1F] transition-colors">Privacy policy</Link></li>
                <li><Link to="/terms" className="hover:text-[#1D1D1F] transition-colors">Terms of service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-[#D2D2D7] text-sm text-[#6E6E73] flex flex-col md:flex-row justify-between items-center gap-4">
            <div>© 2026 ATG Concordia (Pvt) Ltd · Colombo, Sri Lanka</div>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-[#6E6E73]">Privacy</Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-[#6E6E73]">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
