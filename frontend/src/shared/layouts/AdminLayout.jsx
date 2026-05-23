import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Navbar, Sidebar } from '@shared/components';
import { ADMIN_NAV_LINKS } from '@shared/constants';

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-violet-950">
      <Navbar links={ADMIN_NAV_LINKS} isAdmin={true} portalType="admin" />
      <Sidebar 
        links={ADMIN_NAV_LINKS} 
        isCollapsed={sidebarCollapsed}
        onToggle={setSidebarCollapsed}
        portalType="admin"
      />
      
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`pt-16 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </motion.main>

      {/* Background decorations - Purple/Violet theme for Admin */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-[500px] h-[500px] bg-fuchsia-600/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default AdminLayout;
