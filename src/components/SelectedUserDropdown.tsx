import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ChevronDown,
  UserCircle,
  Package,
  CreditCard,
  Gift,
  TrendingDown,
  FileText,
  Database,
  X
} from 'lucide-react';
import { useSelectedUserStore } from '../store/selectedUserStore';
import { shm_request } from '../lib/shm_request';

export default function SelectedUserDropdown() {
  const { selectedUsers, activeUserId, removeSelectedUser, setActiveUser } = useSelectedUserStore();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<{[key: string]: HTMLDivElement}>({});
  const navigate = useNavigate();

  const activeUser = selectedUsers.find(u => u.id === activeUserId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && dropdownRefs.current[openDropdownId] &&
          !dropdownRefs.current[openDropdownId].contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdownId]);

  if (selectedUsers.length === 0) {
    return null;
  }

  const getMenuItems = (user: any) => [
    {
      icon: UserCircle,
      label: 'Профиль',
      onClick: () => {
        navigate(`/users/${user.user_id}`);
        setOpenDropdownId(null);
      }
    },
    {
      icon: Package,
      label: 'Услуги',
      onClick: () => {
        navigate('/user-services');
        setOpenDropdownId(null);
      }
    },
    {
      icon: CreditCard,
      label: 'Платежи',
      onClick: () => {
        navigate('/pays');
        setOpenDropdownId(null);
      }
    },
    {
      icon: Gift,
      label: 'Бонусы',
      onClick: () => {
        navigate('/bonuses');
        setOpenDropdownId(null);
      }
    },
    {
      icon: TrendingDown,
      label: 'Списания',
      onClick: () => {
        navigate('/withdraws');
        setOpenDropdownId(null);
      }
    },
    {
      icon: FileText,
      label: 'Персональные данные',
      onClick: () => {
        navigate('/profiles');
        setOpenDropdownId(null);
      }
    },
    {
      icon: Database,
      label: 'Хранилище',
      onClick: () => {
        navigate('/storage');
        setOpenDropdownId(null);
      }
    },
  ];

  const getDisplayName = (user: any) =>
    user.login || user.full_name || user.email || user.name || `ID: ${user.user_id}`;

  return (
    <div className="flex items-center gap-1">
      {selectedUsers.map((userItem, index) => {
        const { id, user } = userItem;
        const displayName = getDisplayName(user);
        const isActive = id === activeUserId;
        const isOpen = openDropdownId === id;

        return (
          <div key={id} className="relative" ref={(el) => {
            if (el) dropdownRefs.current[id] = el;
          }}>
            <div className="flex items-center">
              <button
                onClick={() => {
                  if (isActive) {
                    setOpenDropdownId(isOpen ? null : id);
                  } else {
                    setActiveUser(id);
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded transition-colors"
                style={{
                  backgroundColor: isActive
                    ? (isOpen ? 'var(--theme-button-secondary-bg)' : 'var(--accent-primary)')
                    : 'transparent',
                  color: isActive
                    ? (isOpen ? 'var(--theme-header-text)' : 'var(--accent-text)')
                    : 'var(--theme-content-text-muted)',
                  border: isActive ? 'none' : '1px solid var(--theme-card-border)',
                }}
                title={`Пользователь: ${displayName}`}
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium max-w-[150px] truncate">
                  {displayName}
                </span>
                {isActive && (
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
              </button>
            </div>

            {isActive && isOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpenDropdownId(null)}
                />
                <div
                  className="absolute left-0 top-full mt-1 w-56 rounded shadow-lg z-50 py-1"
                  style={{
                    backgroundColor: 'var(--theme-card-bg)',
                    border: '1px solid var(--theme-card-border)',
                  }}
                >
                  {/* Заголовок */}
                  <div
                    className="px-4 py-2 border-b"
                    style={{
                      borderColor: 'var(--theme-border)',
                    }}
                  >
                    <div className="text-sm font-medium" style={{ color: 'var(--theme-content-text)' }}>
                      {displayName}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                      ID: {user.user_id}
                    </div>
                  </div>

                  {/* Пункты меню */}
                  {getMenuItems(user).map((item, menuIndex) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={menuIndex}
                        onClick={item.onClick}
                        className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors"
                        style={{
                          color: 'var(--theme-content-text)',
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-hover-bg)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    );
                  })}

                  {/* Пункт "Закрыть" */}
                  <div
                    className="border-t mt-1 pt-1"
                    style={{
                      borderColor: 'var(--theme-border)',
                    }}
                  >
                    <button
                      onClick={() => {
                        removeSelectedUser(id);
                        setOpenDropdownId(null);
                      }}
                      className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors"
                      style={{
                        color: 'var(--theme-button-danger-text)',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--theme-hover-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <X className="w-4 h-4" />
                      <span className="text-sm">Закрыть</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
