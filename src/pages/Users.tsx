import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DataTable, { SortDirection } from '../components/DataTable';
import { UserCreateModal } from '../modals';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { buildApiFilters, appendFilterToUrl } from '../lib/filterUtils';
import { createApiUrl } from '../lib/basePath';
import { Plus } from 'lucide-react';
import { useSelectedUserStore } from '../store/selectedUserStore';

const userColumns = [
  { key: 'user_id', label: 'ID', visible: true, sortable: true},
  { key: 'login', label: 'Логин', visible: true, sortable: true },
  { key: 'full_name', label: 'Клиент', visible: true, sortable: true },
  { key: 'balance', label: 'Баланс', visible: true, sortable: true },
  { key: 'bonus', label: 'Бонусы', visible: true, sortable: true },
  { key: 'settings', label: 'Settings', visible: true, sortable: false },
  { key: 'block', label: 'block', visible: false, sortable: false },
  { key: 'phone', label: 'phone', visible: false, sortable: true },
  { key: 'created', label: 'Дата создания', visible: false, sortable: true },
  { key: 'last_login', label: 'Последний вход', visible: false, sortable: true },
  { key: 'can_overdraft', label: 'can_overdraft', visible: false, sortable: true },
  { key: 'comment', label: 'comment', visible: false, sortable: false },
  { key: 'create_act', label: 'create_act', visible: false, sortable: true },
  { key: 'credit', label: 'credit', visible: false, sortable: true },
  { key: 'discount', label: 'discount', visible: false, sortable: true },
  { key: 'dogovor', label: 'dogovor', visible: false, sortable: true },
  { key: 'gid', label: 'gid', visible: false, sortable: true },
  { key: 'partner_id', label: 'partner_id', visible: false, sortable: true },
  { key: 'password', label: 'password', visible: false, sortable: true },
  { key: 'perm_credit', label: 'perm_credit', visible: false, sortable: true },
  { key: 'type', label: 'type', visible: false, sortable: true },
  { key: 'verified', label: 'verified', visible: false, sortable: true },
];

function Users() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<'like' | 'exact'>('like');

  const { addSelectedUser } = useSelectedUserStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, fm: 'like' | 'exact', sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `shm/v1/admin/user?limit=${l}&offset=${o}`;

    const activeFilters = buildApiFilters(f, fm);
    url = appendFilterToUrl(url, activeFilters);

    if (sf && sd) {
      url += `&sort_field=${sf}&sort_direction=${sd}`;
    }
    shm_request(url)
      .then(res => {
        const { data: items, total: count } = normalizeListResponse(res);
        setData(items);
        setTotal(count);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  }, [limit, offset, filters, filterMode, sortField, sortDirection]);

  const handlePageChange = (newLimit: number, newOffset: number) => {
    setLimit(newLimit);
    setOffset(newOffset);
  };

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(direction ? field : undefined);
    setSortDirection(direction);
    setOffset(0);
  };

  const handleFilterChange = useCallback((newFilters: Record<string, string>, newFilterMode: 'like' | 'exact') => {
    setFilters(newFilters);
    setFilterMode(newFilterMode);
    setOffset(0);
  }, []);

  const handleRowClick = (row: any) => {
    addSelectedUser(row);
    navigate(`/users/${row.user_id}`);
  };

  const handleCreate = () => {
    setCreateModalOpen(true);
  };



  const handleSaveNew = async (userData: any) => {
    try {
      await shm_request('shm/v1/admin/user', {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      toast.success('Пользователь успешно создан');
      // Обновляем данные после создания
      fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
    } catch (error) {
      toast.error('Ошибка создания пользователя');
      throw error;
    }
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Пользователи</h2>
        </div>
        <button
          onClick={handleCreate}
          className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-primary"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)'
          }}
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>
      <DataTable
        columns={userColumns}
        data={data}
        loading={loading}
        total={total}
        limit={limit}
        offset={offset}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onFilterChange={handleFilterChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onRowClick={handleRowClick}
        onRefresh={() => fetchData(limit, offset, filters, filterMode, sortField, sortDirection)}
        storageKey="users"
      />

      <UserCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSaveNew}
      />
    </div>
  );
}

export default Users;
