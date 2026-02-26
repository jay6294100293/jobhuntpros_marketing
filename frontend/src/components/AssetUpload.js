import React, { useState } from 'react';
import { Upload as UploadIcon, File, Image as ImageIcon, Video, FileText, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AssetUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const handleFileUpload = async (event, fileType) => {
    const selectedFiles = Array.from(event.target.files);
    setUploading(true);
    
    try {
      const uploadedFiles = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', fileType);
        
        const response = await axios.post(`${API}/upload`, formData);
        uploadedFiles.push({
          ...response.data,
          name: file.name,
          type: fileType
        });
      }
      
      setFiles([...files, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };
  
  const removeFile = (fileId) => {
    setFiles(files.filter(f => f.id !== fileId));
  };
  
  const getFileIcon = (type) => {
    switch(type) {
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'document': return <FileText className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold mb-3" data-testid="asset-upload-title">Asset Manager</h1>
        <p className="text-zinc-400">Upload screenshots, videos, and documents for your content</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <label className="relative group cursor-pointer" data-testid="upload-image-area">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'image')}
            className="hidden"
            data-testid="image-upload-input"
          />
          <div className="bg-zinc-900/40 backdrop-blur-sm border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:border-indigo-500/50 transition-all">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
            <p className="font-semibold mb-1">Upload Images</p>
            <p className="text-sm text-zinc-500">Screenshots, UI assets</p>
          </div>
        </label>
        
        <label className="relative group cursor-pointer" data-testid="upload-video-area">
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={(e) => handleFileUpload(e, 'video')}
            className="hidden"
            data-testid="video-upload-input"
          />
          <div className="bg-zinc-900/40 backdrop-blur-sm border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:border-violet-500/50 transition-all">
            <Video className="w-12 h-12 mx-auto mb-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
            <p className="font-semibold mb-1">Upload Videos</p>
            <p className="text-sm text-zinc-500">Raw footage, clips</p>
          </div>
        </label>
        
        <label className="relative group cursor-pointer" data-testid="upload-document-area">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFileUpload(e, 'document')}
            className="hidden"
            data-testid="document-upload-input"
          />
          <div className="bg-zinc-900/40 backdrop-blur-sm border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-all">
            <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
            <p className="font-semibold mb-1">Upload Documents</p>
            <p className="text-sm text-zinc-500">PDFs, feature guides</p>
          </div>
        </label>
      </div>
      
      {uploading && (
        <div className="text-center py-8" data-testid="uploading-indicator">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-zinc-400">Uploading...</p>
        </div>
      )}
      
      {files.length > 0 && (
        <div>
          <h2 className="text-2xl font-heading font-semibold mb-4">Uploaded Assets ({files.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="uploaded-files-grid">
            {files.map((file) => (
              <div key={file.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between" data-testid={`file-${file.id}`}>
                <div className="flex items-center gap-3">
                  <div className="text-indigo-400">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  data-testid={`remove-file-${file.id}`}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
