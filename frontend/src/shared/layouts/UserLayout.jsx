import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@shared/components';
import { USER_NAV_LINKS } from '@shared/constants';

const UserLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950">
      <Navbar links={USER_NAV_LINKS} isAdmin={false} portalType="user" />
      
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-16"
      >
        <Outlet />
      </motion.main>

      {/* Background decorations - Blue/Cyan theme for User */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default UserLayout;
