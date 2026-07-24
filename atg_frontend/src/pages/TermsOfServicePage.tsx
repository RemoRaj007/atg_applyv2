import BackButton from '../components/ui/BackButton';
import { useTranslation } from 'react-i18next';

const TermsOfServicePage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans py-16 px-8">
      <div className="max-w-3xl mx-auto bg-slate-800/90 border border-slate-700 p-10 rounded-2xl shadow-2xl">
        <div className="mb-8">
          <BackButton label={t('common.backToHome')} to="/" variant="dark" />
        </div>
        
        <h1 className="text-4xl font-black text-white mb-2">{t('termsPage.title')}</h1>
        <p className="text-slate-400 mb-10 text-sm">{t('termsPage.lastUpdated')}</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('termsPage.sec1Title')}</h2>
            <p>{t('termsPage.sec1Text')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('termsPage.sec2Title')}</h2>
            <div className="bg-red-500/10 p-4 border-l-4 border-red-500 mb-4 rounded-r-lg">
              <span className="font-bold text-red-400">{t('termsPage.sec2Badge')}</span>
            </div>
            <p>{t('termsPage.sec2Text')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('termsPage.sec3Title')}</h2>
            <p>{t('termsPage.sec3Text')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('termsPage.sec4Title')}</h2>
            <p>{t('termsPage.sec4Text')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('termsPage.sec5Title')}</h2>
            <div className="bg-[#0f172a] p-4 border-l-4 border-blue-500 mb-4 rounded-r-lg">
              <span className="font-bold text-white">{t('termsPage.sec5Badge')}</span>
            </div>
            <p>{t('termsPage.sec5Text')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('termsPage.sec6Title')}</h2>
            <p>{t('termsPage.sec6Text')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('termsPage.sec7Title')}</h2>
            <p>{t('termsPage.sec7Text')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('termsPage.sec8Title')}</h2>
            <p>{t('termsPage.sec8Text')}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
