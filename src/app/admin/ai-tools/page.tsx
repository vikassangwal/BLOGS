'use client';
import { useState } from 'react';
import { Sparkles, Search, TrendingUp, ChevronRight, Loader2, Copy, Check, Link2 } from 'lucide-react';

export default function AIToolsPage() {
  const [activeTab, setActiveTab] = useState('seo');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!input) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: activeTab, input })
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
      else alert(data.error || 'Generation failed');
    } catch (e) {
      alert('Error generating content');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-fade-in">
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">AI Tools <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Magic</span></h1>
          <p className="text-gray-400 mt-1">Supercharge your blog with advanced AI utilities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { id: 'seo', name: 'Auto SEO Gen', icon: Sparkles, desc: 'Titles, Meta & Tags' },
          { id: 'keyword', name: 'Keyword Gen', icon: Search, desc: 'LSI & Long-tail Keywords' },
          { id: 'rank', name: 'Rank Master', icon: TrendingUp, desc: 'Google Discover Strategy' },
          { id: 'link', name: 'Link Finder', icon: Link2, desc: 'Official Domain & URLs' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResult(null); setInput(''); }}
              className={`p-6 rounded-2xl border text-left transition-all ${
                isActive 
                ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]' 
                : 'bg-[#121212] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-6 h-6 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                {isActive && <ChevronRight className="w-5 h-5 text-purple-400" />}
              </div>
              <h3 className={`font-semibold text-lg ${isActive ? 'text-white' : 'text-gray-300'}`}>{tab.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{tab.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 md:p-8 mt-8">
        <h2 className="text-xl font-bold text-white mb-4">
          {activeTab === 'seo' && 'Enter Blog Topic or Title'}
          {activeTab === 'keyword' && 'Enter Seed Keyword'}
          {activeTab === 'rank' && 'Enter Target Keyword'}
          {activeTab === 'link' && 'Enter Job or Exam Name'}
        </h2>
        
        <div className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeTab === 'seo' ? 'e.g. UPSC NDA 2026 Notification...' :
              activeTab === 'keyword' ? 'e.g. SSC CGL...' : 
              activeTab === 'link' ? 'e.g. Bihar Police Constable Result...' : 'e.g. Best smartphones under 20000...'
            }
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !input}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Generate
          </button>
        </div>

        {result && (
          <div className="mt-8 pt-8 border-t border-white/10 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" /> AI Magic Result
              </h3>
            </div>
            
            {activeTab === 'seo' && result.title && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Optimized SEO Title</label>
                  <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/5 flex justify-between items-start gap-4">
                    <p className="text-white font-medium">{result.title}</p>
                    <button onClick={() => copyToClipboard(result.title)} className="text-gray-500 hover:text-white p-2">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Meta Description</label>
                  <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/5 flex justify-between items-start gap-4">
                    <p className="text-gray-300">{result.description}</p>
                    <button onClick={() => copyToClipboard(result.description)} className="text-gray-500 hover:text-white p-2">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Trending Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {result.tags?.map((tag: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keyword' && result.highVolume && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-green-400 font-semibold mb-3 border-b border-white/10 pb-2">High Volume</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {result.highVolume.map((kw: string, i: number) => <li key={i}>• {kw}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-blue-400 font-semibold mb-3 border-b border-white/10 pb-2">Long-Tail (Easy to rank)</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {result.longTail?.map((kw: string, i: number) => <li key={i}>• {kw}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-orange-400 font-semibold mb-3 border-b border-white/10 pb-2">FAQs / Questions</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {result.questions?.map((kw: string, i: number) => <li key={i}>• {kw}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'link' && result.domain && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Official Domain</label>
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20 flex justify-between items-start gap-4">
                    <p className="text-green-400 font-bold text-lg">{result.domain}</p>
                    <button onClick={() => copyToClipboard(result.domain)} className="text-gray-500 hover:text-white p-2">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Magic Search Links (Click to find real URL)</label>
                  <div className="flex flex-col gap-3">
                    {result.links?.map((link: any, i: number) => (
                      <a key={i} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-white/5 hover:border-purple-500/50 rounded-xl transition-all group">
                        <span className="text-gray-200 font-medium group-hover:text-purple-400">{link.name}</span>
                        <Link2 className="w-4 h-4 text-gray-500 group-hover:text-purple-400" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rank' && typeof result === 'string' && (
              <div className="prose prose-invert max-w-none p-6 bg-[#0a0a0a] rounded-xl border border-white/5">
                <div dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>') }} />
              </div>
            )}

            {/* Fallback for raw text if JSON failed */}
            {typeof result === 'string' && activeTab !== 'rank' && (
               <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/5 text-gray-300 whitespace-pre-wrap">
                 {result}
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
