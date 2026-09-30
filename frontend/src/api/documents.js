import api from './client';

export const listDocuments = () => api.get('/documents');
export const getDocument = (id) => api.get(`/documents/${id}`);
export const createDocument = (data) => api.post('/documents', data);
export const updateDocument = (id, data) => api.patch(`/documents/${id}`, data);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// Sharing
export const shareDocument = (id, data) =>
  api.post(`/documents/${id}/shares`, data);
export const revokeShare = (docId, shareId) =>
  api.delete(`/documents/${docId}/shares/${shareId}`);

// File upload
export const uploadDocumentFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload/document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadAttachment = (docId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/upload/attachment/${docId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
