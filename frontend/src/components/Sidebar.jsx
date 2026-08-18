import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, User, Flag,
  BarChart3, Cpu, Activity, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import RakshakLogo from './RakshakLogo';

export default function Sidebar({ collapsed, onToggleCollapse, onOpenSettings }) {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
    { path: '/squads',     label: 'Squad Monitoring',  icon: Users },
    { path: '/soldiers/1', label: 'Soldiers',          icon: User,     matchPrefix: '/soldiers' },
    { path: '/missions',   label: 'Missions',          icon: Flag },
    { path: '/analytics',  label: 'Analytics',         icon: BarChart3 },
    { path: '/ai-insights',label: 'AI Insights',       icon: Cpu },
    { path: '/simulation', label: 'Simulation',        icon: Activity },
  ];

  return (
    <aside style={{
      width: collapsed ? '64px' : '200px',
      background: '#F2EDE3',          /* cream — exact match */
      borderRight: '1px solid #E8E0D5',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'width 200ms ease',
      zIndex: 50,
      userSelect: 'none',
      flexShrink: 0,
    }}>

      {/* Logo */}
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '0 1rem' : '0 1.25rem',
        borderBottom: '1px solid #E8E0D5',
      }}>
        <RakshakLogo collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        padding: '1rem 0.6rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        overflowY: 'auto',
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPrefix
            ? location.pathname.startsWith(item.matchPrefix)
            : location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: collapsed ? '0.65rem' : '0.6rem 0.85rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                /* Active = solid saffron orange pill, white text — matches reference exactly */
                color:      isActive ? '#FFFFFF'  : '#64748B',
                background: isActive ? '#EF6A18'  : 'transparent',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = '#EDE6DB';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon
                size={18}
                color={isActive ? '#FFFFFF' : '#64748B'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title={collapsed ? 'Settings' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: collapsed ? '0.65rem' : '0.6rem 0.85rem',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#64748B',
            cursor: 'pointer',
            transition: 'background 150ms ease',
            marginTop: '0.5rem',
            width: '100%',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#EDE6DB')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Settings size={18} color="#64748B" strokeWidth={2} />
          {!collapsed && <span>Settings</span>}
        </button>
      </nav>

      {/* Footer */}
      <div style={{
        padding: '0.75rem',
        borderTop: '1px solid #E8E0D5',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}>
        {!collapsed && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E8E0D5',
            borderRadius: '10px',
            padding: '0.55rem 0.75rem',
            fontSize: '0.7rem',
            color: '#94A3B8',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              color: '#1E293B',
              marginBottom: '0.15rem',
            }}>
              <span>RAKSHAK v0.1</span>
              <span style={{
                background: '#DCFCE7',
                color: '#16A34A',
                border: '1px solid #BBF7D0',
                borderRadius: '999px',
                fontSize: '0.58rem',
                fontWeight: 700,
                padding: '0.1em 0.45em',
                letterSpacing: '0.05em',
              }}>SIH</span>
            </div>
            <div>Software Prototype Engine</div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '0.5rem',
            width: '100%',
            padding: '0.5rem 0.6rem',
            border: '1px solid #E8E0D5',
            borderRadius: '10px',
            background: '#FFFFFF',
            color: '#64748B',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#EDE6DB')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span>Collapse sidebar</span></>
          }
        </button>
      </div>
    </aside>
  );
}
