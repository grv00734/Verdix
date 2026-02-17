import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, Star, Filter, ShieldCheck, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const LawyerCard = ({ lawyer }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass p-6 flex flex-col md:flex-row gap-6 hover:border-violet-500/30 transition-all group"
  >
    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-slate-800 flex-shrink-0 overflow-hidden relative">
      {lawyer.userId?.profileImage ? (
        <img src={lawyer.userId.profileImage} alt={lawyer.userId.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 text-2xl font-bold text-slate-500">
          {lawyer.userId?.name?.[0] || 'L'}
        </div>
      )}
      {lawyer.verificationStatus === 'verified' && (
        <div className="absolute top-0 right-0 p-1 bg-green-500/20 backdrop-blur-sm rounded-bl-lg">
          <ShieldCheck className="w-4 h-4 text-green-400" />
        </div>
      )}
    </div>

    <div className="flex-1">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-white mb-1 group-hover:text-violet-400 transition-colors">
            {lawyer.userId?.name || 'Unknown Lawyer'}
          </h3>
          <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {lawyer.officeLocation?.city || 'India'}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" /> {lawyer.experience} Years Exp.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="font-bold text-amber-500">{lawyer.rating || 'New'}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {lawyer.specialization.map((spec, i) => (
          <span key={i} className="px-2 py-1 bg-slate-800 rounded-md text-xs text-slate-300 border border-slate-700">
            {spec}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
        <div className="text-sm">
          <span className="text-slate-400">Consultation: </span>
          <span className="text-white font-semibold">₹{lawyer.consultationFee}</span>
        </div>
        <button className="btn-gradient px-4 py-2 text-sm shadow-lg shadow-violet-500/10">
          Book Consultation
        </button>
      </div>
    </div>
  </motion.div>
);

export default function SearchLawyers() {
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    specialization: '',
    location: '',
    minRating: 0
  });

  useEffect(() => {
    fetchLawyers();
  }, [filters]);

  const fetchLawyers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Build query string
      const params = new URLSearchParams();
      if (filters.specialization) params.append('specialization', filters.specialization);
      if (filters.location) params.append('location', filters.location);

      const res = await axios.get(`${API_URL}/lawyers/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLawyers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filter Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="glass p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-6 text-slate-300">
              <Filter className="w-5 h-5" />
              <h2 className="font-semibold">Filters</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                  Specialization
                </label>
                <select
                  className="w-full p-2 glass-input text-sm"
                  value={filters.specialization}
                  onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}
                >
                  <option value="">All Areas</option>
                  <option value="Criminal">Criminal Defense</option>
                  <option value="Civil">Civil Litigation</option>
                  <option value="Family">Family Law</option>
                  <option value="Corporate">Corporate Law</option>
                  <option value="Property">Property & Real Estate</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                  City / Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. Delhi"
                    className="w-full pl-9 p-2 glass-input text-sm"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                  Minimum Rating
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  className="w-full accent-violet-500"
                  value={filters.minRating}
                  onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Any</span>
                  <span>{filters.minRating}+ Stars</span>
                </div>
              </div>

              <button
                onClick={() => setFilters({ specialization: '', location: '', minRating: 0 })}
                className="w-full py-2 btn-ghost text-sm"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white mb-6">Find Legal Experts</h1>

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass h-40 animate-pulse" />
              ))}
            </div>
          ) : lawyers.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/20 rounded-2xl border border-slate-700 border-dashed">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300">No lawyers found</h3>
              <p className="text-slate-500">Try adjusting your filters to broaden your search.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {lawyers.map(lawyer => (
                <LawyerCard key={lawyer._id} lawyer={lawyer} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
