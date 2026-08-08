import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import MarketingHeader from '../components/layout/MarketingHeader';
import { paymentOptionApi } from '../api/paymentOptionApi';
import type { PaymentOption } from '../types/paymentOption.types';
import { useNavigate } from 'react-router-dom';

const defaultPlans = [
  {
    name: 'Trial',
    price: 0,
    currency: 'USD',
    appsCount: 2,
    description: 'Prove the quality before you pay a cent.',
    features: [
      '2 full applications, fully managed',
      'Profile research + fit scoring',
      'Tailored CV + motivation letter',
      'Proof of every submission',
    ],
    isPopular: false,
  },
  {
    name: 'Starter',
    price: 60,
    currency: 'USD',
    appsCount: 50,
    description: 'For students and early-stage jobseekers.',
    features: [
      '50 managed applications',
      'Everything in Trial',
      'Application tracker + documents',
      'Email + WhatsApp updates',
    ],
    isPopular: false,
  },
  {
    name: 'Professional',
    price: 100,
    currency: 'USD',
    appsCount: 100,
    description: 'Best balance of value and volume.',
    features: [
      '100 managed applications',
      'Priority research turnaround',
      'Interview follow-up tracking',
      'Multi-country targeting',
    ],
    isPopular: true,
  },
  {
    name: 'Premium',
    price: 150,
    currency: 'USD',
    appsCount: 150,
    description: 'For serious, multi-location job hunts.',
    features: [
      '150 managed applications',
      'Fastest turnaround',
      'Dedicated specialist',
      'Roles across multiple countries',
    ],
    isPopular: false,
  },
];

import { useTranslation } from 'react-i18next';

const PricingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>(defaultPlans);

  useEffect(() => {
    paymentOptionApi
      .list()
      .then((data: PaymentOption[]) => {
        if (data && data.length > 0) {
          const mapped = data.map((item) => {
            let featList: string[] = [];
            if (typeof item.features === 'string') {
              try {
                featList = JSON.parse(item.features);
              } catch {
                featList = [item.features];
              }
            } else if (Array.isArray(item.features)) {
              featList = item.features;
            }
            return {
              name: item.name,
              price: item.price,
              currency: item.currency || 'USD',
              appsCount: item.appsCount,
              description: item.description || '',
              features: featList,
              isPopular: item.isPopular,
            };
          });
          setPlans(mapped);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans">
      <MarketingHeader />
      <div className="max-w-6xl mx-auto py-16 px-8">
        <div className="mb-8">
          <BackButton label={t('common.backToHome')} to="/" variant="dark" />
        </div>
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-4">{t('pricingPage.title')}</h1>
          <p className="text-xl text-slate-300">{t('pricingPage.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan, index) => {
            const isPop = plan.isPopular;
            return (
              <div
                key={plan.name + index}
                className={`rounded-2xl p-8 shadow-xl flex flex-col relative transition-all ${
                  isPop
                    ? 'bg-slate-900 border-2 border-blue-500 shadow-2xl transform lg:-translate-y-4'
                    : 'bg-slate-800/90 border border-slate-700'
                }`}
              >
                {isPop && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-md">
                    {t('pricingPage.mostPopular')}
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-6 h-10">{plan.description}</p>
                <div className="mb-6 flex items-baseline gap-1">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-black text-white">{t('pricingPage.free')}</span>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-white">${plan.price}</span>
                      <span className="text-slate-400 text-sm font-medium">{plan.currency || 'USD'}</span>
                    </>
                  )}
                </div>
                <div className="text-blue-400 font-bold mb-6 pb-6 border-b border-slate-700">
                  {plan.appsCount} {t('pricingPage.appsCount')}
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((f: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-300">
                      <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register')}
                  className={`w-full py-3 font-bold rounded-xl transition-colors cursor-pointer ${
                    isPop
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30'
                      : plan.price === 0
                      ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                      : 'border border-slate-600 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {plan.price === 0 ? t('pricingPage.startFreeBtn') : `${t('pricingPage.chooseBtn')} ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Add-On Services Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-4">Add-On Services</h2>
            <p className="text-lg text-slate-300">Extend your capabilities with specialized services</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* University & Scholarships Add-On */}
            <div className="rounded-2xl p-8 shadow-xl flex flex-col bg-slate-800/90 border border-slate-700">
              <h3 className="text-2xl font-bold text-white mb-2">University & Scholarships</h3>
              <p className="text-slate-400 text-sm mb-6 h-10">Assistance with university and scholarship applications</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$150</span>
                <span className="text-slate-400 text-sm font-medium">USD</span>
              </div>
              <div className="text-blue-400 font-bold mb-6 pb-6 border-b border-slate-700">
                Up to 20 applications
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>20 university/scholarship applications</span>
                </li>
                <li className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>One-time purchase</span>
                </li>
                <li className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>Unlimited validity</span>
                </li>
              </ul>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 font-bold rounded-xl transition-colors cursor-pointer border border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                Purchase Add-On
              </button>
            </div>

            {/* Visa & Documents Add-On */}
            <div className="rounded-2xl p-8 shadow-xl flex flex-col bg-slate-800/90 border border-slate-700">
              <h3 className="text-2xl font-bold text-white mb-2">Visa & Documents</h3>
              <p className="text-slate-400 text-sm mb-6 h-10">Assistance with visa, ID, citizenship, and document applications</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$100</span>
                <span className="text-slate-400 text-sm font-medium">USD</span>
              </div>
              <div className="text-blue-400 font-bold mb-6 pb-6 border-b border-slate-700">
                Unlimited applications
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>Visa, ID, citizenship applications</span>
                </li>
                <li className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>Bank & other documents</span>
                </li>
                <li className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>One-time purchase</span>
                </li>
              </ul>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 font-bold rounded-xl transition-colors cursor-pointer border border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                Purchase Add-On
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-slate-400 text-sm">
          <p>{t('pricingPage.paymentNote')}</p>
          <p className="mt-2">{t('pricingPage.refundNote')}</p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
