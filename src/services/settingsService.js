 import api from '../utils/api'

// أسماء الـ endpoints هون افتراضية (مش موجودة عندك بالباك بعد)
// عدّليها لما يجهز الباك إند لتطابق المسارات الفعلية
export const settingsAPI = {
  getNotificationSettings: () => api.get('/api/admin/settings/notifications'),
  updateNotificationSettings: (data) => api.put('/api/admin/settings/notifications', data),
  changePassword: (data) => api.put('/api/admin/settings/change-password', data),
}