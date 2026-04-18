'use client'
import React from 'react'
import NotificationCenter from '@/components/NotificationCenter'
import Link from 'next/link'
import { ChevronLeft, BookOpen, Target, Users, Zap, Clock, ShieldAlert, Trophy, RotateCcw, Info } from 'lucide-react'

export default function LeadGuidePage() {
    return (
        <>
            <div className="crm-content" style={{ padding: '32px', overflowY: 'auto' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <Link href="/leads" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }} className="hover-text-primary">
                        <ChevronLeft size={16} /> Back to Leads
                    </Link>
                    <NotificationCenter />
                </div>

                    <div style={{ position: 'relative', marginBottom: 44, padding: '48px', background: 'rgba(30,41,59,0.4)', backdropFilter: 'blur(30px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 50px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: 20, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 24px -6px var(--accent-primary)' }}>
                            <BookOpen size={32} />
                        </div>
                        <h1 style={{ fontSize: 36, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.5px' }}>Lead Management & Lifecycle</h1>
                        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 600 }}>
                            This guide explains how leads move through the CRM, how ownership is managed, and the automated systems that ensure no lead is left behind.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                        {/* Section 1: Pipeline */}
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                    <Target size={18} />
                                </div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>1. The Lead Pipeline</h2>
                            </div>
                            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 24, background: 'rgba(30,41,59,0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '14px 24px', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                    <div>Status</div>
                                    <div>Description</div>
                                </div>
                                {[
                                    { s: 'New', d: 'A freshly imported or manually created lead that hasn\'t been contacted yet.' },
                                    { s: 'Mail Sent', d: 'The first email has been logged. This is considered a "Meaningful Action."' },
                                    { s: 'Called', d: 'A call has been logged. This also resets the "Reclaim Clock."' },
                                    { s: 'Negotiation', d: 'Active discussion or a sent proposal.' },
                                    { s: 'Converted / Won', d: 'The lead has reached the end of the pipeline and is ready to become an Opportunity.' },
                                    { s: 'Lost', d: 'The lead is marked "Not Interested" or doesn\'t move forward.' },
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', padding: '16px 20px', borderBottom: i === 5 ? 'none' : '1px solid var(--border)', fontSize: 14 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.s}</div>
                                        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.d}</div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Section 2: Ownership */}
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                    <Users size={18} />
                                </div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>2. Ownership & The Open Pool</h2>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div className="card hover-lift" style={{ padding: 24, borderRadius: 24, background: 'rgba(30,41,59,0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.1)' }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.3px' }}>The Open Pool</h3>
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        Contains all unassigned leads. Sales reps can browse this pool and "Claim" leads to move them into their personal dashboard.
                                    </p>
                                </div>
                                <div className="card hover-lift" style={{ padding: 24, borderRadius: 24, background: 'rgba(30,41,59,0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.1)' }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.3px' }}>Active Limits</h3>
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        The system enforces a <strong>Claim Limit</strong> (approx. 10 active leads) to ensure quality follow-up over quantity.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section 3: Meaningful Activity */}
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                    <Zap size={18} />
                                </div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>3. Meaningful Activity</h2>
                            </div>
                            <div className="card" style={{ padding: 28, borderRadius: 24, background: 'rgba(245,158,11,0.02)', backdropFilter: 'blur(20px)', border: '1px solid rgba(245,158,11,0.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 20px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                                    <div style={{ padding: 12, borderRadius: 12, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                                        <Info size={24} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Notes alone do NOT reset the auto-reclaim clock.</p>
                                        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                            Only "Meaningful Activities"—specifically <strong>Calls</strong> and <strong>Emails</strong>—tell the system that a lead is being actively worked. Updating a note keeps the lead status active, but it won't stop the reclaim timer.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 4: Maintenance */}
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                    <Clock size={18} />
                                </div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>4. Maintenance & Auto-Rules</h2>
                            </div>
                            
                            <div style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    Priority-Based Reclaim <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>(The "Stale" Rule)</span>
                                </h3>
                                <div className="card" style={{ padding: 24, borderRadius: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, textAlign: 'center', background: 'rgba(30,41,59,0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.1)' }}>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', marginBottom: 8, letterSpacing: '0.5px' }}>HIGH PRIORITY</div>
                                        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>7 Days</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>To Pool</div>
                                    </div>
                                    <div style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', marginBottom: 8, letterSpacing: '0.5px' }}>MEDIUM PRIORITY</div>
                                        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>14 Days</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>To Pool</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#10b981', marginBottom: 8, letterSpacing: '0.5px' }}>LOW PRIORITY</div>
                                        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>21 Days</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>To Pool</div>
                                    </div>
                                </div>
                            </div>

                            <div className="card hover-lift" style={{ padding: 24, borderRadius: 24, background: 'rgba(30,41,59,0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 20px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <RotateCcw size={18} color="var(--accent-primary)" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.3px' }}>"Lost" Lead Recirculation</h3>
                                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                            When a lead is marked "Lost," it stays with you for <strong>60 days</strong>. After that, it returns to the Open Pool as a "Cold Lead," allowing others to attempt a fresh re-engagement.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 5: Gamification */}
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                                    <Trophy size={18} />
                                </div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>5. Leaderboard & XP</h2>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                {[
                                    { label: 'New Lead', xp: '100 XP' },
                                    { label: 'Log Call', xp: '25 XP' },
                                    { label: 'Log Email', xp: '20 XP' },
                                    { label: 'Convert', xp: '500 XP' },
                                ].map((xp, i) => (
                                    <div key={i} className="card hover-lift" style={{ padding: '16px', textAlign: 'center', borderRadius: 16, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 16px rgba(0,0,0,0.05)' }}>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: '#8b5cf6', marginBottom: 4 }}>{xp.xp}</div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{xp.label}</div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Final Tip */}
                        <div style={{ padding: '24px', borderRadius: 16, background: 'var(--bg-input)', border: '1px dashed var(--border)', textAlign: 'center', marginBottom: 40 }}>
                            <ShieldAlert size={32} color="var(--accent-primary)" style={{ marginBottom: 12 }} />
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Received a Warning?</h3>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                                Log a call or email outcome immediately to reset the timer and keep the lead in your portfolio.
                            </p>
                            <Link href="/leads" className="btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>Go to My Leads</Link>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .hover-text-primary:hover {
                    color: var(--text-primary) !important;
                }
                .hover-lift {
                    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .hover-lift:hover {
                    transform: translateY(-2px);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.1) !important;
                }
            `}</style>
        </>
    )
}
