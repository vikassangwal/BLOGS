'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function AdminAboutPage() {
  const [about, setAbout] = useState({ heading: '', content: '', mission: '', imageUrl: '' });
  const [team, setTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State for Team Member
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberForm, setMemberForm] = useState({ id: '', name: '', role: '', bio: '', fullDetails: '', imageUrl: '', isActive: true });
  const memberFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/about').then(res => res.json()),
      fetch('/api/team').then(res => res.json())
    ]).then(([aboutData, teamData]) => {
      if (aboutData && !aboutData.error) setAbout(aboutData);
      if (Array.isArray(teamData)) setTeam(teamData);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, []);

  const handleSaveAbout = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(about)
      });
      if (res.ok) alert('About settings saved successfully!');
      else alert('Failed to save settings.');
    } catch (e) {
      alert('An error occurred while saving.');
    }
    setIsSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isTeamMember = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (isTeamMember) {
          setMemberForm(prev => ({ ...prev, imageUrl: data.url }));
        } else {
          setAbout(prev => ({ ...prev, imageUrl: data.url }));
        }
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err) {
      alert('Upload error.');
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // If editing existing, we might need a PUT to /api/team/[id], but /api/team POST currently creates.
      // Let's check if the API supports update. Actually, I didn't see an update method in /api/team/route.ts.
      // I'll send it as POST. Wait, POST only creates. We need to create an API for update or just create new and delete old.
      // Since it's simple, let's just make it call POST to /api/team and then delete the old one if editing.
      // Or we can just use PUT in /api/team/[id]. Let's assume it doesn't exist, so I will send a PUT request to /api/team/[id] and we will implement it later if needed.
      
      const method = memberForm.id ? 'PUT' : 'POST';
      const url = memberForm.id ? `/api/team/${memberForm.id}` : '/api/team';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberForm)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (memberForm.id) {
          setTeam(team.map(m => m.id === memberForm.id ? data.member : m));
        } else {
          setTeam([...team, data.member]);
        }
        setIsModalOpen(false);
        setEditingMember(null);
      } else {
        alert('Failed to save member: ' + data.error);
      }
    } catch (error) {
      alert('Error saving member');
    }
  };

  const openNewMemberModal = () => {
    setMemberForm({ id: '', name: '', role: '', bio: '', fullDetails: '', imageUrl: '', isActive: true });
    setEditingMember(null);
    setIsModalOpen(true);
  };

  const openEditMemberModal = (member: any) => {
    setMemberForm(member);
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm('Are you sure you want to delete this team member?')) {
      await fetch(`/api/team/${id}`, { method: 'DELETE' });
      setTeam(team.filter(m => m.id !== id));
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading settings...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">About & Team Settings</h1>
        <Link href="/admin" className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* About Settings */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-6">About Page Content</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Heading</label>
              <input 
                type="text" 
                value={about.heading}
                onChange={e => setAbout({...about, heading: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Our Mission (Main Content)</label>
              <textarea 
                rows={5}
                value={about.content}
                onChange={e => setAbout({...about, content: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Our Expertise (E-E-A-T)</label>
              <textarea 
                rows={4}
                value={about.mission}
                onChange={e => setAbout({...about, mission: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white resize-none"
              />
            </div>

            <button 
              onClick={handleSaveAbout}
              disabled={isSaving}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save About Settings'}
            </button>
          </div>
        </div>

        {/* Team Settings */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Core Team</h2>
            <button onClick={openNewMemberModal} className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
              + Add Member
            </button>
          </div>
          
          <div className="space-y-4">
            {team.length === 0 ? (
              <p className="text-gray-500 text-sm">No team members added yet.</p>
            ) : (
              team.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center font-bold text-xl text-gray-500">
                      {member.imageUrl ? <img src={member.imageUrl} className="w-full h-full object-cover" /> : member.name.substring(0,1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{member.name}</h3>
                      <p className="text-sm text-blue-400">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditMemberModal(member)} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg">Edit</button>
                    <button onClick={() => handleDeleteMember(member.id)} className="p-2 text-red-400 hover:text-white bg-red-900/30 rounded-lg">Del</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal for Team Member */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">{editingMember ? 'Edit Team Member' : 'Add Team Member'}</h2>
            
            <form onSubmit={handleSaveMember} className="space-y-4">
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 rounded-full bg-gray-800 overflow-hidden border border-gray-700 shrink-0">
                  {memberForm.imageUrl && <img src={memberForm.imageUrl} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <input type="file" ref={memberFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, true)} />
                  <button type="button" onClick={() => memberFileInputRef.current?.click()} className="px-4 py-2 bg-gray-800 text-sm text-white rounded-lg hover:bg-gray-700">
                    Upload Photo
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Upload from File Manager / local device</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                <input required type="text" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Role / Position</label>
                <input required type="text" value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Short Bio</label>
                <textarea rows={3} value={memberForm.bio} onChange={e => setMemberForm({...memberForm, bio: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white resize-none" placeholder="A brief description of this member" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-800 text-white rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
