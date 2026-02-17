import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    FileText, BrainCircuit, ExternalLink, Scale, CheckCircle,
    AlertTriangle, BookOpen, Clock, ChevronLeft
} from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const AnalysisTab = ({ analysis }) => {
    if (!analysis) return (
        <div className="glass p-12 text-center text-slate-400">
            <BrainCircuit className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p>Click "Generate AI Analysis" to get insights for this case.</p>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <div className="glass p-6 border-l-4 border-l-violet-500">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-violet-400" />
                    Likelihood of Success
                </h3>
                <p className="text-slate-300 leading-relaxed">{analysis.likelihoodOfSuccess}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="glass p-6">
                    <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Recommended Strategies
                    </h3>
                    <ul className="space-y-3">
                        {analysis.recommendedStrategy?.map((strat, i) => (
                            <li key={i} className="flex gap-3 text-slate-300 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                {strat}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="glass p-6">
                    <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Potential Risks
                    </h3>
                    <ul className="space-y-3">
                        {analysis.risks?.map((risk, i) => (
                            <li key={i} className="flex gap-3 text-slate-300 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                {risk}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="glass p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    Key Precedents
                </h3>
                <div className="space-y-4">
                    {analysis.keyPrecedents?.map((prec, i) => (
                        <div key={i} className="p-4 bg-slate-800/50 rounded-xl border border-white/5 hover:border-violet-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-slate-200">{prec.caseName}</span>
                                <span className="text-xs text-slate-500">{prec.year}</span>
                            </div>
                            <p className="text-sm text-slate-400">{prec.relevance}</p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default function CaseDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchCaseDetails();
    }, [id]);

    const fetchCaseDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/cases/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCaseData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const generateAnalysis = async () => {
        setAnalyzing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/rag/analyze/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCaseData(prev => ({ ...prev, aiAnalysis: res.data.analysis }));
            setActiveTab('analysis');
        } catch (err) {
            alert('Analysis failed. Please try again later.');
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-white">Loading case...</div>;

    return (
        <div className="min-h-screen pb-20 pt-24 px-6 max-w-7xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </button>

            <div className="flex justify-between items-start gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-white">{caseData.title}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700`}>
                            {caseData.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" /> Created {new Date(caseData.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" /> {caseData.caseType}
                        </span>
                    </div>
                </div>

                {!caseData.aiAnalysis && (
                    <button
                        onClick={generateAnalysis}
                        disabled={analyzing}
                        className="btn-gradient px-6 py-3 flex items-center gap-2 shadow-lg shadow-violet-500/20"
                    >
                        {analyzing ? (
                            <>Analyzing...</>
                        ) : (
                            <>
                                <BrainCircuit className="w-5 h-5" />
                                Generate AI Analysis
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-8 border-b border-white/10 mb-8">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-4 px-2 text-sm font-medium transition-all relative ${activeTab === 'overview' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    Case Overview
                    {activeTab === 'overview' && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`pb-4 px-2 text-sm font-medium transition-all relative ${activeTab === 'analysis' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    AI Analysis
                    {activeTab === 'analysis' && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500" />
                    )}
                </button>
            </div>

            {activeTab === 'overview' ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid md:grid-cols-3 gap-8"
                >
                    <div className="md:col-span-2 space-y-8">
                        <div className="glass p-8">
                            <h3 className="text-lg font-semibold text-white mb-4">Description</h3>
                            <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                                {caseData.description}
                            </p>
                        </div>

                        <div className="glass p-8">
                            <h3 className="text-lg font-semibold text-white mb-4">Documents</h3>
                            <div className="p-12 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-violet-500/50 hover:bg-slate-800/30 transition-all cursor-pointer">
                                <FileText className="w-8 h-8 mb-2" />
                                <p>Drag and drop files here to upload</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass p-6">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Timeline</h3>
                            <div className="space-y-6 relative pl-4 border-l border-slate-700">
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-violet-500" />
                                    <p className="text-sm text-slate-300">Case Created</p>
                                    <p className="text-xs text-slate-500">{new Date(caseData.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <AnalysisTab analysis={caseData.aiAnalysis} />
            )}
        </div>
    );
}
