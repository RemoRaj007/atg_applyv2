import BackButton from '../components/ui/BackButton';
import MarketingHeader from '../components/layout/MarketingHeader';
import { useTranslation } from 'react-i18next';

const HowItWorksPage = () => {
  const { t } = useTranslation();

  const steps = [
    { num: '1', title: 'You visit and start free', desc: 'No card needed. Create your account and begin the guided intake.' },
    { num: '2', title: 'Complete your intake', desc: 'Profile, work experience, target roles and CV — about 12 minutes, save-as-you-go.' },
    { num: '3', title: 'Submit your profile', desc: 'Everything lands securely with your assigned ATG team in Sri Lanka.' },
    { num: '4', title: '2 free applications granted', desc: 'Your trial balance is added instantly so you can see the service before paying.' },
    { num: '5', title: 'We review & research', desc: 'Your team studies your profile and researches roles that genuinely fit.' },
    { num: '6', title: 'Jobs added with a fit score', desc: 'Each role gets a 0–100 fit score and a plain-English reason for the rating.' },
    { num: '7', title: 'Direct application execution', desc: 'Assigned operators prepare and submit applications directly for your selected roles.' },
    { num: '8', title: 'We tailor & quality-check', desc: 'CV and motivation letter tailored to the role, then checked by a second person.' },
    { num: '9', title: 'A human submits the application', desc: 'Applied manually — no scraping, no auto-apply bots, ever.' },
    { num: '10', title: 'Proof appears on your dashboard', desc: 'Confirmation email, application ID or screenshot — logged as proof for each submission.' },
    { num: '11', title: 'Continue with a package', desc: 'Happy after your trial? Pick Starter, Professional or Premium and your balance updates.' },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans">
      <MarketingHeader />
      <div className="max-w-4xl mx-auto py-16 px-8">
        <div className="mb-8">
          <BackButton label={t('common.backToHome')} to="/" variant="dark" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4">{t('howItWorksPage.title')}</h1>
        <p className="text-xl text-slate-300 mb-12">{t('howItWorksPage.subtitle')}</p>

        <div className="space-y-6 mb-16">
          {steps.map((step) => (
            <div key={step.num} className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl shadow-xl flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center font-bold text-xl">
                {step.num}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-slate-300">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-3xl font-black text-white mb-8">{t('howItWorksPage.fitScoreTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/90 border border-emerald-500/30 p-6 rounded-2xl shadow-xl">
            <h3 className="font-bold text-emerald-400 text-lg mb-1">{t('howItWorksPage.highFitTitle')}</h3>
            <p className="text-slate-300 text-sm">{t('howItWorksPage.highFitDesc')}</p>
          </div>
          <div className="bg-slate-800/90 border border-amber-500/30 p-6 rounded-2xl shadow-xl">
            <h3 className="font-bold text-amber-400 text-lg mb-1">{t('howItWorksPage.mediumFitTitle')}</h3>
            <p className="text-slate-300 text-sm">{t('howItWorksPage.mediumFitDesc')}</p>
          </div>
          <div className="bg-slate-800/90 border border-red-500/30 p-6 rounded-2xl shadow-xl">
            <h3 className="font-bold text-red-400 text-lg mb-1">{t('howItWorksPage.lowFitTitle')}</h3>
            <p className="text-slate-300 text-sm">{t('howItWorksPage.lowFitDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
