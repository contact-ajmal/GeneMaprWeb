import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Dna, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            await login({ email, password })
            navigate('/dashboard', { replace: true })
        } catch (err: any) {
            setError(err.message || 'Invalid email or password')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            {/* Decorative background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-dna-cyan/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-dna-magenta/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                className="w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-dna-cyan to-blue-600
              rounded-2xl shadow-glow-cyan mb-4"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                        <Dna className="w-8 h-8 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-headline font-bold text-slate-100">
                        Welcome Back
                    </h1>
                    <p className="text-slate-400 mt-2 font-body">
                        Sign in to your GeneMapr account
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-8 space-y-5">
                    {error && (
                        <motion.div
                            className="p-3 rounded-lg bg-dna-magenta/10 border border-dna-magenta/30 text-sm text-dna-magenta"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-body font-medium text-slate-300 mb-1.5">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="researcher@lab.org"
                            required
                            autoFocus
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-dna-cyan/15
                text-slate-100 placeholder-slate-500 font-body
                focus:outline-none focus:border-dna-cyan/50 focus:ring-1 focus:ring-dna-cyan/30
                transition-colors"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-body font-medium text-slate-300 mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={8}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-dna-cyan/15
                  text-slate-100 placeholder-slate-500 font-body
                  focus:outline-none focus:border-dna-cyan/50 focus:ring-1 focus:ring-dna-cyan/30
                  transition-colors pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-xl font-body font-semibold text-white
              bg-gradient-to-r from-dna-cyan to-blue-600
              hover:from-dna-cyan/90 hover:to-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-glow-cyan transition-all flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                Sign In
                            </>
                        )}
                    </motion.button>

                    {/* Register link */}
                    <p className="text-center text-sm text-slate-400 font-body">
                        Don't have an account?{' '}
                        <Link
                            to="/register"
                            className="text-dna-cyan hover:text-dna-cyan/80 font-medium transition-colors"
                        >
                            Create Account
                        </Link>
                    </p>
                </form>

                {/* Footer */}
                <p className="text-center text-xs text-slate-600 mt-6 font-body">
                    GeneMapr — Premium Genomic Variant Interpretation Platform
                </p>
            </motion.div>
        </div>
    )
}
