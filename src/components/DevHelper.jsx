import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDevHelper } from '@/contexts/DevHelperContext';

const routeToFileMap = {
  '/': 'src/pages/HomePage.jsx',
  '/login': 'src/pages/LoginPage.jsx',
  '/signup': 'src/pages/SignUpPage.jsx',
  '/wizard': 'src/pages/InvitationWizard.jsx',
  '/preview': 'src/pages/InvitationPreview.jsx',
  '/create-event': 'src/pages/InvitationWizard.jsx', // Redirected
  '/profile': 'src/pages/ProfilePage.jsx',
  '/settings': 'src/pages/GlobalSettingsPage.jsx',
  '/host/:eventId': 'src/pages/HostDashboard.jsx',
  '/host/:eventId/moderation': 'src/pages/Moderation.jsx',
  '/host/:eventId/settings': 'src/pages/EventSettings.jsx',
  '/host/:eventId/analytics': 'src/pages/AnalyticsPage.jsx',
  '/host/:eventId/rsvps': 'src/pages/RsvpPage.jsx',
  '/host/:eventId/guests': 'src/pages/GuestsPage.jsx',
  '/host/:eventId/tables': 'src/pages/TablesPage.jsx',
  '/host/:eventId/planner': 'src/pages/planner/PlannerDashboard.jsx',
  '/host/:eventId/planner/tasks': 'src/pages/planner/PlannerTasks.jsx',
  '/host/:eventId/planner/timeline': 'src/pages/planner/PlannerTimeline.jsx',
  '/host/:eventId/planner/providers': 'src/pages/planner/PlannerProviders.jsx',
  '/host/:eventId/planner/budget': 'src/pages/planner/PlannerBudget.jsx',
  '/host/:eventId/planner/documents': 'src/pages/planner/PlannerDocuments.jsx',
  '/event/:eventId': 'src/pages/EventLanding.jsx',
  '/invitation/:eventId': 'src/pages/InvitationPage.jsx',
  '/event/:eventId/upload': 'src/pages/GuestUpload.jsx',
  '/event/:eventId/gallery': 'src/pages/EventGallery.jsx',
  '/event/:eventId/guestbook': 'src/pages/GuestBook.jsx',
  '/event/:eventId/slideshow': 'src/pages/Slideshow.jsx',
  '/event/:eventId/find-table': 'src/pages/FindTablePage.jsx',
};

const findMatchingRoute = (pathname) => {
  const dynamicRoutes = Object.keys(routeToFileMap).filter(key => key.includes(':'));
  const staticRoute = routeToFileMap[pathname];

  if (staticRoute) return staticRoute;

  for (const route of dynamicRoutes) {
    const regex = new RegExp(`^${route.replace(/:\w+/g, '[^/]+')}$`);
    if (regex.test(pathname)) {
      return routeToFileMap[route];
    }
  }

  return 'Ruta no encontrada en el mapa.';
};


const DevHelper = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isDevHelperVisible } = useDevHelper();

  const filePath = findMatchingRoute(location.pathname);

  if (!isDevHelperVisible) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
          aria-label="Mostrar ruta del archivo actual"
        >
          <HelpCircle size={24} />
        </motion.button>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-50 bg-gray-800 text-white p-4 rounded-lg shadow-2xl border border-blue-500/50 max-w-sm"
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-lg">Ruta del Componente</h4>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="font-mono bg-gray-900 p-2 rounded text-sm text-cyan-300 break-all">
              {filePath}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DevHelper;