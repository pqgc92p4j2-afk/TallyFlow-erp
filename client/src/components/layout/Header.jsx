import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/authSlice';
import { setActiveCompany } from '../../store/companySlice';
import { toggleTheme } from '../../store/uiSlice';
import { FiLogOut, FiSun, FiMoon } from 'react-icons/fi';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { activeCompany } = useSelector((state) => state.company);
  const { theme } = useSelector((state) => state.ui);

  const handleThemeToggle = (e) => {
    const x = e.clientX;
    const y = e.clientY;

    if (!document.startViewTransition) {
      dispatch(toggleTheme());
      return;
    }

    document.documentElement.style.setProperty('--click-x', `${x}px`);
    document.documentElement.style.setProperty('--click-y', `${y}px`);

    // Add directional class for CSS animations
    const targetTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.remove('theme-to-dark', 'theme-to-light');
    document.documentElement.classList.add(`theme-to-${targetTheme}`);

    document.startViewTransition(() => {
      dispatch(toggleTheme());
    });
  };

  const handleLogout = () => {
    dispatch(logout());
    dispatch(setActiveCompany(null));
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <h2>{activeCompany?.name || 'TallyFlow ERP'}</h2>
        {activeCompany?.financialYearStart && (
          <span className="badge badge-purple">
            FY {new Date(activeCompany.financialYearStart).getFullYear()}-{new Date(activeCompany.financialYearEnd).getFullYear()}
          </span>
        )}
      </div>
      <div className="header-right">
        <div className="header-company" onClick={() => navigate('/company')}>
          <span>{activeCompany?.baseCurrency || 'INR'}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{activeCompany?.currencySymbol || '₹'}</span>
        </div>
        <button className="btn btn-ghost theme-toggle-btn" onClick={handleThemeToggle} title="Toggle Theme">
          <FiSun size={18} className={`theme-icon-sun ${theme === 'dark' ? 'icon-hidden' : ''}`} />
          <FiMoon size={18} className={`theme-icon-moon ${theme === 'light' ? 'icon-hidden' : ''}`} />
        </button>
        <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="header-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.role}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout"
            style={{ marginLeft: '8px' }}>
            <FiLogOut />
          </button>
        </div>
      </div>
    </header>
  );
}
