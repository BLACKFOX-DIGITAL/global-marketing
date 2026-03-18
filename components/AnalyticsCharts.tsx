'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts'
import { Loader2 } from 'lucide-react'

export function AnalyticsDashboard() {
  const [data, setData] = useState<{ funnel: any[], performance: any[] } | null>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
  }, [])

  if (!data) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Loader2 className="spinner" size={32} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
        
        {/* Performance Area Chart */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Deals Won (Last 30 Days)</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.performance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: 'var(--accent-primary)', fontWeight: 600 }}
                  cursor={{ stroke: 'var(--accent-glow)', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="deals" name="Deals Won" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorDeals)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Funnel Bar Chart (Vertical) */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Conversion Funnel</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.funnel} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} width={130} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-card-hover)' }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                />
                <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]} barSize={28}>
                  {data.funnel.map((entry, index) => {
                      const colors = ['#3b82f6', '#8b5cf6', '#10b981']
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
