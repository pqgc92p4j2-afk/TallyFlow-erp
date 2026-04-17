import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useScrollRestoration from '../../hooks/useScrollRestoration';

export default function MainLayout() {
  useScrollRestoration();
  
  return (
    <div className="app-layout">
      <Sidebar />
      <Header />
      <main className="main-content">
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
