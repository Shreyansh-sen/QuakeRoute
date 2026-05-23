import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '@shared/layouts';
import {
  AdminDashboard,
  AdminRequests,
  AdminRequestDetail,
  AdminAllocations,
  AdminAnalytics,
  AdminCreateDisaster,
} from '@admin/pages';

const AdminRoutes = () => {
  return (
    <Routes>
      {/* Redirect root to admin dashboard */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="create-disaster" element={<AdminCreateDisaster />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="request/:id" element={<AdminRequestDetail />} />
        <Route path="allocations" element={<AdminAllocations />} />
        <Route path="analytics" element={<AdminAnalytics />} />
      </Route>

      {/* Catch all - redirect to admin */}
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

export default AdminRoutes;
