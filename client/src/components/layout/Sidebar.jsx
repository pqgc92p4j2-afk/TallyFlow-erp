import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FiHome, FiLayers, FiBook, FiFileText, FiBarChart2, FiDollarSign, 
  FiPieChart, FiCalendar, FiSettings, FiCreditCard, FiTrendingUp, 
  FiPrinter, FiUsers, FiList, FiShield, FiBox, FiClock,
  FiChevronDown, FiChevronRight 
} from 'react-icons/fi';
import { useState, useEffect } from 'react';

const navItems = [
  { section: 'Main', items: [
    { path: '/', label: 'Dashboard', icon: FiHome },
  ]},
  { section: 'Billing', items: [
    { path: '/customers', label: 'Customers', icon: FiUsers },
    { path: '/products', label: 'Inventory / Stock', icon: FiBox },
    { path: '/tax-invoice', label: 'Billing & Challans', icon: FiPrinter },
    { path: '/invoice-history', label: 'Invoice History', icon: FiList },
    { path: '/statement', label: 'Overall Statement', icon: FiFileText },
  ]},
  { section: 'Daily Entries', items: [
    { path: '/vouchers/new/Receipt', label: 'Cash In / Out Entry', icon: FiDollarSign },
    { path: '/vouchers/new/Sales', label: 'Sales / Purchase Entry', icon: FiTrendingUp },
  ]},
  { section: 'Advanced Accounting', items: [
    { path: '/ledgers', label: 'Ledgers', icon: FiBook },
    { path: '/vouchers', label: 'All Vouchers', icon: FiFileText },
    { path: '/history', label: 'Activity History', icon: FiClock },
  ]},
  { section: 'Reports', items: [
    { path: '/reports/balance-sheet', label: 'Balance Sheet', icon: FiPieChart },
    { path: '/reports/profit-loss', label: 'Profit & Loss', icon: FiTrendingUp },
    { path: '/reports/day-book', label: 'Day Book', icon: FiCalendar },
  ]},
  { section: 'Admin', items: [
    { path: '/admin', label: 'Admin Panel', icon: FiShield },
  ]},
  { section: 'Settings', items: [
    { path: '/company', label: 'Profile', icon: FiSettings },
  ]},
];

export default function Sidebar() {
  const location = useLocation();
  const { activeCompany } = useSelector((state) => state.company);
  const { isAdminMode } = useSelector((state) => state.auth);
  
  // State to track which sections are expanded
  const [openSections, setOpenSections] = useState({});

  // Auto-expand the section that contains the active route on navigation
  useEffect(() => {
    const currentPath = location.pathname;
    const activeSection = navItems.find(section => 
      section.items.some(item => item.path === currentPath)
    );
    
    if (activeSection) {
      setOpenSections(prev => {
        // If the section state is already defined (true or false), keep it.
        // This allows the user to manually collapse it and stay collapsed.
        if (prev[activeSection.section] !== undefined) return prev;
        
        return {
          ...prev,
          [activeSection.section]: true
        };
      });
    }
  }, [location.pathname]);

  const toggleSection = (sectionName) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">TF</div>
        <div>
          <h1>TallyFlow</h1>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {activeCompany?.name || 'No Company'}
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems
          .filter(section => {
            if (isAdminMode) return section.section === 'Admin';
            return section.section !== 'Admin';
          })
          .map((section) => (
          <div className="nav-section" key={section.section}>
            <div 
              className="nav-section-title" 
              onClick={() => toggleSection(section.section)}
            >
              <span>{section.section}</span>
              <span className={`nav-section-header-icon ${openSections[section.section] ? 'rotated' : ''}`}>
                <FiChevronDown />
              </span>
            </div>
            
            <div className={`nav-section-content ${openSections[section.section] ? 'expanded' : ''}`}>
              <div className="nav-section-content-inner">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `nav-item ${isActive && location.pathname === item.path ? 'active' : ''}`}
                    end={item.path === '/'}
                  >
                    <span className="nav-icon"><item.icon /></span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
