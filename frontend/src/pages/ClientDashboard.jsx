import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Search, FileText, AlertCircle, Clock, CheckCircle,
  ChevronRight, LogOut, Scale, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const CaseCard = ({ caseData }) => {
  const navigate = useNavigate();

  const statusColors = {
    open: 'badge-green',
    'in-progress': 'badge-amber',
    closed: 'badge-red',
    draft: 'text-slate-400 bg-slate-800 border-slate-700'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass p-6 card-hover relative group cursor-pointer"
      onClick={() => navigate(`/cases/${caseData._id}`)}
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`badge ${statusColors[caseData.status] || 'badge-purple'} capitalize`}>
          {caseData.status}
        </span>
        <span className="text-xs text-slate-500 font-mono">
          {new Date(caseData.createdAt).toLocaleDateString()}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-violet-400 transition-colors">
        {caseData.title}
      </h3>
      <p className="text-slate-400 text-sm line-clamp-2 mb-6">
        {caseData.description}
      </p>

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FileText className="w-3 h-3" />
          {caseData.caseType}
        </div>
        <button className="text-xs font-medium text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          View Details <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseData, setNewCaseData] = useState({ title: '', description: '', caseType: 'Civil' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/cases/my-cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(res.data);
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/cases`, newCaseData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowNewCaseModal(false);
      setNewCaseData({ title: '', description: '', caseType: 'Civil' });
      fetchCases(); // Refresh list
    } catch (err) {
      alert('Failed to create case');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    navigate('/login');
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Navbar */}
      <nav className="glass-nav sticky top-0 z-40 px-6 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Verdix</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/search-lawyers" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Find Lawyers
            </Link>
            <Link to="/subscription" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Plans
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Cases</h1>
            <p className="text-slate-400">Manage and track your legal matters</p>
          </div>
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="btn-gradient px-6 py-3 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-5 h-5" />
            New Case
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Active Cases</h3>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">{cases.length}</div>
          </div>
          <div className="glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Pending Actions</h3>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">0</div>
          </div>
          <div className="glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">AI Insights</h3>
              <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                <BrainCircuit className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">Available</div>
          </div>
        </div>

        {/* Case List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Loading cases...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="glass p-12 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No cases yet</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">Start by creating your first case to get AI analysis and find lawyer recommendations.</p>
            <button
              onClick={() => setShowNewCaseModal(true)}
              className="btn-ghost px-6 py-2"
            >
              Create New Case
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {cases.map((c) => (
                <CaseCard key={c._id} caseData={c} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* New Case Modal */}
      <AnimatePresence>
        {showNewCaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong w-full max-w-lg p-8 relative"
            >
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                ✕
              </button>

              <h2 className="text-2xl font-bold text-white mb-6">Create New Case</h2>

              <form onSubmit={handleCreateCase} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Case Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 glass-input"
                    placeholder="e.g. Property Dispute in Delhi"
                    value={newCaseData.title}
                    onChange={(e) => setNewCaseData({ ...newCaseData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Case Type</label>
                  <select
                    className="w-full px-4 py-2 glass-input"
                    value={newCaseData.caseType}
                    onChange={(e) => setNewCaseData({ ...newCaseData, caseType: e.target.value })}
                  >
                    <option value="Civil">Civil</option>
                    <option value="Criminal">Criminal</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Family">Family</option>
                    <option value="Property">Property</option>
                    <option value="Labor">Labor</option>
                    <option value="Intellectual Property">Intellectual Property</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                  <textarea
                    required
                    rows="4"
                    className="w-full px-4 py-2 glass-input resize-none"
                    placeholder="Describe the details of your case..."
                    value={newCaseData.description}
                    onChange={(e) => setNewCaseData({ ...newCaseData, description: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewCaseModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn-gradient px-6 py-2"
                  >
                    {creating ? 'Creating...' : 'Create Case'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
