import api from './api'

export const getTickets  = (params = {}) => api.get('tickets/', { params })
export const getTicket   = (id)          => api.get(`tickets/${id}/`)
export const createTicket = (data)       =>
  api.post('tickets/create/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const updateTicket = (id, data)   =>
  api.put(`tickets/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const deleteTicket = (id)         => api.delete(`tickets/${id}/`)
export const assignTicket = (id, agentId) =>
  api.post(`tickets/${id}/assign/`, { assigned_to: agentId })
export const updateStatus = (id, status) =>
  api.patch(`tickets/${id}/status/`, { status })
