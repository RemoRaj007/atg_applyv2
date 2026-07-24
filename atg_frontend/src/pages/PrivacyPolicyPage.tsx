import BackButton from '../components/ui/BackButton';
import { useTranslation } from 'react-i18next';

const PrivacyPolicyPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans py-16 px-8">
      <div className="max-w-3xl mx-auto bg-slate-800/90 border border-slate-700 p-10 rounded-2xl shadow-2xl">
        <div className="mb-8">
          <BackButton label={t('common.backToHome')} to="/" variant="dark" />
        </div>
        
        <h1 className="text-4xl font-black text-white mb-2">{t('privacyPage.title')}</h1>
        <p className="text-slate-400 mb-10 text-sm">{t('privacyPage.lastUpdated')}</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('privacyPage.whoWeAreTitle')}</h2>
            <p>{t('privacyPage.whoWeAreText')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('privacyPage.whatWeCollectTitle')}</h2>
            <p>{t('privacyPage.whatWeCollectText')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('privacyPage.retentionTitle')}</h2>
            <div className="bg-[#0f172a] p-4 border-l-4 border-blue-500 mb-4 rounded-r-lg">
              <span className="font-bold text-white">{t('privacyPage.retentionBadge')}</span>
            </div>
            <p>{t('privacyPage.retentionText')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('privacyPage.deletionTitle')}</h2>
            <div className="bg-[#0f172a] p-4 border-l-4 border-blue-500 mb-4 rounded-r-lg">
              <span className="font-bold text-white">{t('privacyPage.deletionBadge')}</span>
            </div>
            <p>{t('privacyPage.deletionText')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('privacyPage.sensitiveDataTitle')}</h2>
            <p>{t('privacyPage.sensitiveDataText')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('privacyPage.noScrapingTitle')}</h2>
            <p>{t('privacyPage.noScrapingText')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('privacyPage.refundsTitle')}</h2>
            <p>{t('privacyPage.refundsText')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('privacyPage.commitmentTitle')}</h2>
            <div className="bg-[#0f172a] p-4 border-l-4 border-blue-500 mb-4 rounded-r-lg">
              <span className="font-bold text-white">{t('privacyPage.commitmentBadge')}</span>
            </div>
            <p>{t('privacyPage.commitmentText')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4">{t('privacyPage.rightsTitle')}</h2>
            <p>{t('privacyPage.rightsText')}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
