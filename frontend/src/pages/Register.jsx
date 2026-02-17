import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, Phone, ArrowRight, Loader2, Briefcase, Scale } from 'lucide-react';
import clsx from 'clsx';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export default function Register() {
  const [userType, setUserType] = useState('client'); // 'client' or 'lawyer'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    userType: 'client' // default
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTypeChange = (type) => {
    setUserType(type);
    setFormData({ ...formData, userType: type });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, userType };
      const res = await axios.post(`${API_URL}/auth/register`, payload);

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userType', res.data.user.userType);

      if (res.data.user.userType === 'lawyer') {
        navigate('/lawyer-dashboard');
      } else {
        navigate('/client-dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden py-20">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="orb orb-1" style={{ top: '10%', left: '10%' }} />
        <div className="orb orb-2" style={{ bottom: '10%', right: '10%' }} />
      </div>

      <div className="glass-strong p-8 md:p-10 w-full max-w-lg relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-slate-400">Join Verdix to access premium legal services</p>
        </div>

        {/* User Type Toggle */}
        <div className="flex p-1 bg-slate-900/50 rounded-xl mb-8 border border-slate-700/50">
          <button
            type="button"
            onClick={() => handleTypeChange('client')}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-300",
              userType === 'client'
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <User className="w-4 h-4" />
            I am a Client
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('lawyer')}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-300",
              userType === 'lawyer'
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Scale className="w-4 h-4" />
            I am a Lawyer
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                name="name"
                required
                className="w-full pl-10 pr-4 py-3 glass-input focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                name="email"
                required
                className="w-full pl-10 pr-4 py-3 glass-input focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="tel"
                name="phone"
                className="w-full pl-10 pr-4 py-3 glass-input focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                name="password"
                required
                minLength="6"
                className="w-full pl-10 pr-4 py-3 glass-input focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 btn-gradient flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 font-medium hover:text-violet-300 hover:underline transition-all">
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
