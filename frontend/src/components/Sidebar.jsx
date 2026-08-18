import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, User, Flag,
  BarChart3, Cpu, Activity, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import RakshakLogo from './RakshakLogo';

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  const navItems = [
    { path: '/dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
    { path: '/squads',     label: 'Squad Monitoring',  icon: Users },
    { path: '/soldiers',   label: 'Soldiers',          icon: User,     matchPrefix: '/soldiers' },
    { path: '/missions',   label: 'Missions',          icon: Flag },
    { path: '/analytics',  label: 'Analytics',         icon: BarChart3 },
    { path: '/ai-insights',label: 'AI Insights',       icon: Cpu },
    { path: '/simulation', label: 'Simulation',        icon: Activity },
    { path: '/report',     label: 'Report',            icon: FileText },
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
                if (collapsed) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredItem({
                    label: item.label,
                    top: rect.top + rect.height / 2,
                    left: rect.right + 10,
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
                setHoveredItem(null);
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#EDE6DB';
            if (collapsed) {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredItem({
                label: 'Expand sidebar',
                top: rect.top + rect.height / 2,
                left: rect.right + 10,
              });
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
            setHoveredItem(null);
          }}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span>Collapse sidebar</span></>
          }
        </button>
      </div>

      {/* Floating Popout Badge when Sidebar is Collapsed */}
      {collapsed && hoveredItem && (
        <div
          style={{
            position: 'fixed',
            top: `${hoveredItem.top}px`,
            left: `${hoveredItem.left}px`,
            transform: 'translateY(-50%)',
            background: '#1E293B',
            color: '#FFFFFF',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.25)',
            zIndex: 9999,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '-5px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '5px solid #1E293B',
            }}
          />
          <span>{hoveredItem.label}</span>
        </div>
      )}
    </aside>
  );
}

