import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaBriefcase, FaClock, FaStar, FaBalanceScale } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export default function LawyerDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    licenseNumber: '',
    specializations: '',
    experience: '',
    barCouncil: '',
    consultationFee: '',
    hourlyRate: '',
    bio: ''
  });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        specializations: formData.specializations.split(',').map(s => s.trim()).filter(Boolean)
      };
      await axios.post(`${API_URL}/lawyers/register`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProfile();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating profile');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    navigate('/login');
  };

  const lp = profile?.lawyerProfile;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="glass-nav sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold gradient-text">Verdix</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/subscription')} className="btn-ghost px-4 py-2 text-sm">Subscription</button>
            <button onClick={handleLogout} className="btn-ghost px-4 py-2 text-sm">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-white">Lawyer Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Manage your professional profile</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-violet-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : !lp ? (
          /* Profile Creation Form */
          <div className="glass-strong p-8 animate-slide-up max-w-2xl mx-auto">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white">Complete Your Profile</h3>
              <p className="text-slate-400 text-sm mt-1">Set up your professional details to start receiving client requests</p>
            </div>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">License Number</label>
                  <input type="text" placeholder="BAR/2024/1234" value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-4 py-3 glass-input text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Bar Council</label>
                  <input type="text" placeholder="Bar Council of India" value={formData.barCouncil}
                    onChange={(e) => setFormData({ ...formData, barCouncil: e.target.value })}
                    className="w-full px-4 py-3 glass-input text-sm" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Specializations</label>
                <input type="text" placeholder="Criminal, Civil, Corporate (comma separated)" value={formData.specializations}
                  onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                  className="w-full px-4 py-3 glass-input text-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Experience (yrs)</label>
                  <input type="number" placeholder="5" value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-4 py-3 glass-input text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Consultation ₹</label>
                  <input type="number" placeholder="500" value={formData.consultationFee}
                    onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                    className="w-full px-4 py-3 glass-input text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Hourly Rate ₹</label>
                  <input type="number" placeholder="2000" value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    className="w-full px-4 py-3 glass-input text-sm" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Bio</label>
                <textarea placeholder="Tell clients about your practice..." value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-3 glass-input text-sm" rows="3" />
              </div>

              <button type="submit" className="w-full btn-gradient py-3 text-sm">Create Profile</button>
            </form>
          </div>
        ) : (
          /* Profile Display */
          <div className="animate-fade-in space-y-6">
            {/* Profile Card */}
            <div className="glass-strong p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">{profile.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">{profile.email}</p>
                </div>
                <span className="badge badge-green">Active</span>
              </div>
              {lp.bio && <p className="text-slate-300 text-sm mt-4 leading-relaxed">{lp.bio}</p>}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Experience', value: `${lp.experience || 0} yrs`, icon: <FaCalendarAlt /> },
                { label: 'Consultation', value: `₹${lp.consultationFee || 0}`, icon: <FaBriefcase /> },
                { label: 'Hourly Rate', value: `₹${lp.hourlyRate || 0}`, icon: <FaClock /> },
                { label: 'Rating', value: `${lp.rating || 0}/5`, icon: <FaStar className="text-amber-400" /> },
              ].map((stat, i) => (
                <div key={i} className={`glass p-5 text-center animate-slide-up stagger-${i + 1}`} style={{ opacity: 0 }}>
                  <div className="text-2xl mb-2 text-violet-400 flex justify-center">{stat.icon}</div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Specializations */}
            {lp.specializations?.length > 0 && (
              <div className="glass p-6">
                <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Specializations</h4>
                <div className="flex flex-wrap gap-2">
                  {lp.specializations.map((s, i) => (
                    <span key={i} className="badge badge-purple">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
