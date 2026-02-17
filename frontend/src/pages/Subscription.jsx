import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, Shield, Zap, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const PlanCard = ({ plan, isCurrent, onUpgrade }) => {
  const isPro = plan.name === 'Pro';
  const isPremium = plan.name === 'Premium';

  return (
    <div className={`glass p-8 relative flex flex-col ${isPremium ? 'border-violet-500/50 shadow-lg shadow-violet-500/10 scale-105 z-10' : ''}`}>
      {isPremium && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
          Most Popular
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-300 mb-2">{plan.name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">₹{plan.price}</span>
          {plan.price > 0 && <span className="text-slate-500 text-sm">/month</span>}
        </div>
        <p className="text-sm text-slate-400 mt-2 min-h-[40px]">
          {isPro ? 'For law firms & heavy users' : isPremium ? 'For active legal seekers' : 'For basic queries'}
        </p>
      </div>

      <div className="space-y-4 mb-8 flex-1">
        {Object.entries(plan.features).map(([key, value]) => (
          <div key={key} className="flex items-start gap-3 text-sm">
            {value ? (
              <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            ) : (
              <X className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
            )}
            <span className={value ? 'text-slate-300' : 'text-slate-500'}>
              {key === 'caseSimilaritySearch' ? `${value || 0} Similarity Searches` :
                key === 'maxDocuments' ? `${value || 0} Max Documents` :
                  key === 'consultationRequests' ? `${value || 0} Consultations` :
                    key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onUpgrade(plan.name.toLowerCase())}
        disabled={isCurrent}
        className={`w-full py-3 rounded-xl font-semibold transition-all ${isCurrent
            ? 'glass bg-white/5 text-slate-400 cursor-default'
            : isPremium
              ? 'btn-gradient shadow-lg shadow-violet-500/25'
              : 'glass bg-white/5 border border-white/10 text-white hover:bg-white/10'
          }`}
      >
        {isCurrent ? 'Current Plan' : 'Upgrade Plan'}
      </button>
    </div>
  );
};

export default function Subscription() {
  const [plans, setPlans] = useState({});
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      // Fetch plans
      const plansRes = await axios.get(`${API_URL}/subscription/plans`);
      setPlans(plansRes.data);

      // Fetch user's current plan
      const token = localStorage.getItem('token');
      if (token) {
        const subRes = await axios.get(`${API_URL}/subscription/my-subscription`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentPlan(subRes.data.tier);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier) => {
    try {
      const token = localStorage.getItem('token');
      // In a real app, integrate Stripe here. For now, direct upgrade.
      await axios.post(`${API_URL}/subscription/upgrade`,
        { tier, stripeToken: 'tok_visa' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Successfully upgraded to ${tier}!`);
      setCurrentPlan(tier);
      window.location.reload();
    } catch (err) {
      alert('Upgrade failed');
    }
  };

  if (loading) return <div className="text-center py-20">Loading plans...</div>;

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">Choose your plan</h1>
          <p className="text-slate-400 text-lg">
            Unlock AI-powered analysis, unlimited document storage, and premium lawyer matching.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.free && (
            <PlanCard
              plan={plans.free}
              isCurrent={currentPlan === 'free'}
              onUpgrade={handleUpgrade}
            />
          )}
          {plans.premium && (
            <PlanCard
              plan={plans.premium}
              isCurrent={currentPlan === 'premium'}
              onUpgrade={handleUpgrade}
            />
          )}
          {plans.pro && (
            <PlanCard
              plan={plans.pro}
              isCurrent={currentPlan === 'pro'}
              onUpgrade={handleUpgrade}
            />
          )}
        </div>
      </div>
    </div>
  );
}
