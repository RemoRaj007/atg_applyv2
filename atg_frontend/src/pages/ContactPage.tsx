import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BackButton from '../components/ui/BackButton';
import MarketingHeader from '../components/layout/MarketingHeader';
import { contactApi } from '../api/contactApi';
import { validateEmail } from '../utils/validation';

const ContactPage = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = t('contactPage.errorName');
    if (!validateEmail(form.email).isValid) next.email = t('contactPage.errorEmail');
    if (form.subject.trim().length < 2) next.subject = t('contactPage.errorSubject');
    if (form.message.trim().length < 10) next.message = t('contactPage.errorMessage');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    try {
      setLoading(true);
      await contactApi.submit(form);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setServerError(err.message || t('contactPage.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans">
      <MarketingHeader />
      <div className="max-w-2xl mx-auto py-16 px-8">
        <div className="mb-8">
          <BackButton label={t('common.backToHome')} to="/" variant="dark" />
        </div>

        <h1 className="text-4xl font-black text-white mb-4">{t('contactPage.title')}</h1>
        <p className="text-xl text-slate-300 mb-12">{t('contactPage.subtitle')}</p>

        {sent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl p-8 text-center">
            <p className="text-lg font-bold mb-2">{t('contactPage.successTitle')}</p>
            <p className="text-sm">{t('contactPage.successDesc')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-800/90 border border-slate-700 p-8 rounded-2xl shadow-xl space-y-5">
            {serverError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm">{serverError}</div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">{t('contactPage.nameLabel')}</label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder={t('contactPage.namePlaceholder')}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">{t('contactPage.emailLabel')}</label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder={t('contactPage.emailPlaceholder')}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">{t('contactPage.subjectLabel')}</label>
              <input
                type="text"
                value={form.subject}
                onChange={handleChange('subject')}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder={t('contactPage.subjectPlaceholder')}
              />
              {errors.subject && <p className="text-red-400 text-xs mt-1">{errors.subject}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">{t('contactPage.messageLabel')}</label>
              <textarea
                value={form.message}
                onChange={handleChange('message')}
                rows={6}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none"
                placeholder={t('contactPage.messagePlaceholder')}
              />
              {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {loading ? t('contactPage.sending') : t('contactPage.sendBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactPage;
