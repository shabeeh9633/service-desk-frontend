import api from './api'

export const getComments = (ticketId) => api.get(`comments/${ticketId}/`)
export const addComment  = (ticketId, message) =>
  api.post('comments/', { ticket: ticketId, message })
