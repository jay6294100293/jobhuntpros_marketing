import React, { useState, useEffect } from 'react';
import { FolderOpen, Download, Calendar, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Gallery = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await axios.delete(`${API}/projects/${projectId}`);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success('Project deleted');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    }
  };

  const downloadProject = (project) => {
    const outputs = project.outputs || [];
    if (outputs.length === 0) {
      toast.info('No downloadable files for this project');
      return;
    }
    // Download all output files
    outputs.forEach((url, i) => {
      const a = document.createElement('a');
      a.href = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
      a.download = `${project.name}-${i + 1}`;
      a.click();
    });
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold mb-3" data-testid="gallery-title">Content Gallery</h1>
        <p className="text-zinc-400">View and download your generated content</p>
      </div>
      
      {loading ? (
        <div className="text-center py-12" data-testid="loading-indicator">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-zinc-400">Loading your content...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12" data-testid="empty-gallery">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-400">No content yet. Create your first project!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="gallery-grid">
          {projects.map((project) => (
            <div key={project.id} className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all" data-testid={`project-${project.id}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{project.name}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadProject(project)}
                    className="text-zinc-400 hover:text-indigo-400 transition-colors"
                    title="Download project files"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Calendar className="w-4 h-4" />
                {new Date(project.created_at).toLocaleDateString()}
              </div>
              
              <div className="mt-4 flex gap-2">
                <span className="inline-block px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded">Video</span>
                <span className="inline-block px-2 py-1 bg-violet-500/20 text-violet-400 text-xs rounded">Poster</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
