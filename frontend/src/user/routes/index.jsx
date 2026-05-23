import { Routes, Route } from 'react-router-dom';
import { UserLayout } from '@shared/layouts';
import { 
  UserDashboard, 
  ReportDisaster, 
  AllocationStatus, 
  AllocationMap 
} from '@user/pages';

const UserRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<UserLayout />}>
        <Route index element={<UserDashboard />} />
        <Route path="report" element={<ReportDisaster />} />
        <Route path="allocation-status" element={<AllocationStatus />} />
        <Route path="allocation-map" element={<AllocationMap />} />
      </Route>
    </Routes>
  );
};

export default UserRoutes;
