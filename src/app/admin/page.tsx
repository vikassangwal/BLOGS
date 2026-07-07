'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [autoBlogLogs, setAutoBlogLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeFilter, setTimeFilter] = useState('week');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartTotals, setChartTotals] = useState({ views: 0, leads: 0, posts: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/blog?limit=5').then(r => r.json()),
      fetch('/api/leads?limit=5').then(r => r.json()),
      fetch('/api/auto-blog').then(r => r.json()),
      fetch(`/api/admin/analytics?filter=${timeFilter}`).then(r => r.json())
    ]).then(([blogData, leadsData, autoBlogData, analyticsData]) => {
      setStats({
        totalPosts: blogData.total || 0,
        totalLeads: leadsData.total || 0,
        totalAutoPosts: autoBlogData.stats?.totalAutoPosts || 0,
        pendingKeywords: autoBlogData.stats?.pendingKeywords || 0,
        usedKeywords: autoBlogData.stats?.usedKeywords || 0,
        totalKeywords: autoBlogData.stats?.totalKeywords || 0,
      });
      setRecentPosts(blogData.posts || []);
      setRecentLeads(leadsData.leads || []);
      setAutoBlogLogs(autoBlogData.logs || []);
      if (analyticsData.success) {
        setChartData(analyticsData.chartData);
        setChartTotals(analyticsData.totals);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [timeFilter]);

  if (isLoading) {
    return (
      <div style={{ 
        height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem'
      }}>
        <div style={{ 
          width: '50px', height: '50px', borderRadius: '50%', 
          border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6',
          animation: 'spin 1s linear infinite' 
        }} />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>Loading Dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const pieData = [
    { name: 'AI Posts', value: stats?.totalAutoPosts || 0, color: '#a855f7' },
    { name: 'Manual Posts', value: Math.max(0, (stats?.totalPosts || 0) - (stats?.totalAutoPosts || 0)), color: '#3b82f6' },
  ];

  const keywordPieData = [
    { name: 'Pending', value: stats?.pendingKeywords || 0, color: '#f59e0b' },
    { name: 'Used', value: stats?.usedKeywords || 0, color: '#10b981' },
  ];

  const glassCard: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '1.5rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
            ⚡ Our Blog Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            🕐 {currentTime.toLocaleString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/admin/job-alerts" style={{ 
            textDecoration: 'none', padding: '0.7rem 1.5rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
            fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', transition: 'all 0.3s'
          }}>📡 Job Feed</Link>
          <Link href="/admin/blog/new" style={{ 
            textDecoration: 'none', padding: '0.7rem 1.5rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
            fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)', transition: 'all 0.3s'
          }}>✏️ New Post</Link>
          <Link href="/admin/auto-blog" style={{
            textDecoration: 'none', padding: '0.7rem 1.5rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff',
            fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)', transition: 'all 0.3s'
          }}>🤖 AI Auto-Blog</Link>
        </div>
      </div>

      {/* Global Time Filter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', paddingLeft: '0.5rem' }}>⏱️ Filter:</span>
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--color-text-primary)',
              padding: '0.4rem 0.8rem', outline: 'none', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <option value="mint" style={{background:'#111'}}>Last 60 Minutes</option>
            <option value="hour" style={{background:'#111'}}>Last 24 Hours</option>
            <option value="week" style={{background:'#111'}}>Last 7 Days</option>
            <option value="month" style={{background:'#111'}}>Last 30 Days</option>
            <option value="6mont" style={{background:'#111'}}>Last 6 Months</option>
            <option value="year" style={{background:'#111'}}>Last 1 Year</option>
            <option value="2year" style={{background:'#111'}}>Last 2 Years</option>
            <option value="lifetime" style={{background:'#111'}}>Lifetime</option>
          </select>
        </div>
      </div>



      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👀</div>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total Views</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{chartTotals.views}</div>
            </div>
          </div>
        </div>
        
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>💰</div>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Est. Earnings</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>${(chartTotals.views * 0.005).toFixed(2)}</div>
            </div>
          </div>
        </div>
        
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📝</div>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total Posts</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{chartTotals.posts || stats?.totalPosts}</div>
            </div>
          </div>
        </div>

        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>✨</div>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>AI Generated</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{stats?.totalAutoPosts || 0}</div>
            </div>
          </div>
        </div>

        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎯</div>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total Leads</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{chartTotals.leads || stats?.totalLeads}</div>
            </div>
          </div>
        </div>

        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>⏳</div>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Pending Keywords</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{stats?.pendingKeywords || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Line Chart */}
        <div style={glassCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>📈 Traffic & Leads</h2>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'rgba(15,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', backdropFilter: 'blur(10px)' }} />
                <Line type="monotone" dataKey="views" name="Views" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="leads" name="Leads" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={glassCard}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', textAlign: 'center' }}>📊 Post Types</h3>
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(15,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem' }}>
              {pieData.map((d, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          </div>
          <div style={glassCard}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', textAlign: 'center' }}>🔑 Keywords</h3>
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={keywordPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                    {keywordPieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(15,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem' }}>
              {keywordPieData.map((d, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart - Posts per day */}
      <div style={{ ...glassCard, marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>📊 Publishing Activity</h2>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
              <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'rgba(15,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="posts" name="New Posts" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid: Posts, Leads, Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Posts */}
        <div style={glassCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>📝 Recent Posts</h2>
            <Link href="/admin/blog" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>View All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {recentPosts.map(post => (
              <div key={post.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.title}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600,
                      background: post.status === 'Published' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: post.status === 'Published' ? '#34d399' : '#fbbf24'
                    }}>{post.status}</span>
                    {post.autoGenerated && <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '6px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', fontWeight: 600 }}>✨ AI</span>}
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <Link href={`/admin/blog/edit?slug=${post.slug}`} style={{ padding: '0.4rem 0.8rem', background: 'rgba(59,130,246,0.15)', borderRadius: '8px', color: '#60a5fa', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0, marginLeft: '0.5rem' }}>Edit</Link>
              </div>
            ))}
            {recentPosts.length === 0 && <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem 0' }}>No posts yet. Create your first post! 🚀</p>}
          </div>
        </div>

        {/* Recent Leads */}
        <div style={glassCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>🎯 Recent Leads</h2>
            <Link href="/admin/leads" style={{ color: '#10b981', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>View All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {recentLeads.map(lead => (
              <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{lead.name}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{lead.email}</span>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(16,185,129,0.15)', color: '#34d399', borderRadius: '8px', fontWeight: 600 }}>{lead.source}</span>
              </div>
            ))}
            {recentLeads.length === 0 && <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem 0' }}>No leads yet. They'll appear here! 🎯</p>}
          </div>
        </div>

        {/* Auto-Blog Logs */}
        <div style={glassCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>🤖 AI Auto-Blog Logs</h2>
            <Link href="/admin/auto-blog" style={{ color: '#a855f7', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Settings →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {autoBlogLogs.map((log: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.title || log.keyword}</h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <span style={{ 
                  fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '8px', fontWeight: 600,
                  background: log.status === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: log.status === 'success' ? '#34d399' : '#f87171'
                }}>{log.status === 'success' ? '✅ Success' : '❌ Failed'}</span>
              </div>
            ))}
            {autoBlogLogs.length === 0 && <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem 0' }}>No auto-blog runs yet. 🤖</p>}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ ...glassCard, marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>🔗 Quick Links</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { href: '/admin/blog', icon: '📝', label: 'All Posts', color: '#3b82f6' },
            { href: '/admin/auto-blog', icon: '🤖', label: 'Auto-Blog', color: '#a855f7' },
            { href: '/admin/job-alerts', icon: '📡', label: 'Sourcing Feed', color: '#10b981' },
            { href: '/admin/leads', icon: '🎯', label: 'Leads', color: '#10b981' },
            { href: '/admin/settings', icon: '⚙️', label: 'Settings', color: '#6366f1' },
            { href: '/admin/social-links', icon: '🔗', label: 'Social Links', color: '#ec4899' },
            { href: '/admin/team', icon: '👥', label: 'Team', color: '#f59e0b' },
            { href: '/blog', icon: '🌐', label: 'View Blog', color: '#14b8a6' },
            { href: '/feed.xml', icon: '📡', label: 'RSS Feed', color: '#f97316' },
          ].map((link, i) => (
            <Link key={i} href={link.href} style={{
              textDecoration: 'none', padding: '0.8rem 1rem', borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 600,
              transition: 'all 0.2s ease'
            }}>
              <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
