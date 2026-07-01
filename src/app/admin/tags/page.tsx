'use client';

import React, { useEffect, useState } from 'react';

export default function TagsManagementPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTags(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the tag "${name}"? This cannot be undone.`)) return;

    try {
      await fetch(`/api/tags?id=${id}`, { method: 'DELETE' });
      fetchTags();
    } catch (err) {
      console.error(err);
      alert('Failed to delete tag');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tags Management</h1>
          <p className="text-gray-400">View and manage categories/tags created by auto-blogging.</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-white/10">
        {loading ? (
          <p>Loading tags...</p>
        ) : tags.length === 0 ? (
          <p>No tags found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="p-4">Name</th>
                  <th className="p-4">Slug</th>
                  <th className="p-4 text-center">Linked Posts</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-sm">
                        {tag.name}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{tag.slug}</td>
                    <td className="p-4 text-center">
                      <span className="bg-gray-800 text-gray-200 px-2 py-1 rounded text-xs font-bold">
                        {tag._count?.posts || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDelete(tag.id, tag.name)}
                        className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
