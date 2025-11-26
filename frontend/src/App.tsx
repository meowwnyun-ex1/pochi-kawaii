import { Toaster } from 'sonner';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import Admin from '@/pages/Admin';
import Feedback from '@/pages/Feedback';
import Developing from '@/pages/Developing';

const App = () => {
  // Provide safe defaults for environment variables
  const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/pochi-kawaii';
  const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || '/admin';

  return (
    <>
      <Toaster position="top-right" expand={true} richColors closeButton toastOptions={{ style: { marginTop: '60px' } }} />
      <BrowserRouter basename={BASE_PATH}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/developing" element={<Developing />} />
          <Route path={ADMIN_PATH} element={<Admin />} />
          <Route path="*" element={<Index />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
