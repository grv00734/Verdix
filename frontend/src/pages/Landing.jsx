import { useNavigate } from 'react-router-dom';
import { Scale, Users, FileText, ChevronRight, Shield, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        className="glass p-8 hover:bg-slate-800/50 transition-all duration-300 group"
    >
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6 text-violet-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-slate-100">{title}</h3>
        <p className="text-slate-400 leading-relaxed">{description}</p>
    </motion.div>
);

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background Blobs */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
            </div>

            {/* Navbar */}
            <nav className="glass-nav fixed top-0 w-full z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Scale className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">
                            Verdix
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 text-slate-300 hover:text-white transition-colors font-medium"
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg font-semibold hover:bg-white transition-all hover:scale-105"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="pt-32 pb-20 px-6 relative z-10">
                <div className="max-w-7xl mx-auto text-center">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-6 animate-pulse">
                            ✨ AI-Powered Legal Assistant 2.0
                        </span>
                        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
                            Legal Intelligence <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400">
                                Reimagined for All
                            </span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Connect with top lawyers, get instant AI case analysis, and verify your legal standing in minutes. The future of law is here.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => navigate('/register')}
                                className="px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:-translate-y-1 flex items-center gap-2 group"
                            >
                                Start Free Consultation
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="px-8 py-4 glass border border-slate-700/50 rounded-xl font-semibold text-slate-200 hover:bg-slate-800/50 transition-all"
                            >
                                Lawyer Login
                            </button>
                        </div>
                    </motion.div>

                    {/* Feature Grid */}
                    <div className="grid md:grid-cols-3 gap-6 mt-24">
                        <FeatureCard
                            icon={Shield}
                            title="AI Case Analysis"
                            description="Get instant preliminary analysis of your case with our advanced legal AI model tailored for Indian Law."
                            delay={0.2}
                        />
                        <FeatureCard
                            icon={Users}
                            title="Verified Lawyers"
                            description="Connect with Bar Council verified lawyers. Browse profiles, reviews, and success rates transparently."
                            delay={0.4}
                        />
                        <FeatureCard
                            icon={Globe}
                            title="Smart Matching"
                            description="Our algorithm matches you with the perfect legal expert based on your case type, location, and budget."
                            delay={0.6}
                        />
                    </div>

                    {/* Stats Bar */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 1 }}
                        className="mt-20 py-8 border-y border-slate-800/50 flex flex-wrap justify-center gap-12 md:gap-24"
                    >
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white mb-1">500+</div>
                            <div className="text-slate-500 text-sm uppercase tracking-wider">Verified Lawyers</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white mb-1">10k+</div>
                            <div className="text-slate-500 text-sm uppercase tracking-wider">Cases Analyzed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white mb-1">98%</div>
                            <div className="text-slate-500 text-sm uppercase tracking-wider">Success Rate</div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
