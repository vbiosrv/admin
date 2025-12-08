import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import { UserModal, UserCreateModal, UserChangePasswordModal} from '../modals';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { Plus } from 'lucide-react';

const userColumns = [
  { key: 'user_id', label: 'ID', visible: true, sortable: true},
  { key: 'login', label: 'Логин', visible: true, sortable: true },
  { key: 'full_name', label: 'Имя', visible: true, sortable: true },
  { key: 'balance', label: 'Баланс', visible: true, sortable: true },
  { key: 'bonus', label: 'Бонусы', visible: false, sortable: true },
  { key: 'block', label: 'Блок', visible: false, sortable: false },
  { key: 'phone', label: 'Телефон', visible: false, sortable: true },
  { key: 'created', label: 'Дата создания', visible: false, sortable: true },
  { key: 'last_login', label: 'Последний вход', visible: false, sortable: true },
];

function Users() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Модальные окна
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/user?limit=${l}&offset=${o}`;
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
    fetchData(limit, offset, sortField, sortDirection);
  }, [limit, offset, sortField, sortDirection, fetchData]);

  const handlePageChange = (newLimit: number, newOffset: number) => {
    setLimit(newLimit);
    setOffset(newOffset);
  };

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(direction ? field : undefined);
    setSortDirection(direction);
    setOffset(0);
  };

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setEditModalOpen(true);
  };

  const handleCreate = () => {
    setCreateModalOpen(true);
  };
  
  const handleChangePasswordOpen = () => {
    setChangePasswordModalOpen(true);
  };

  const handleSaveNew = async (userData: any) => {
    await shm_request('/shm/v1/admin/user', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    fetchData(limit, offset, sortField, sortDirection);
  };

  const handleSaveEdit = async (userData: any) => {
    await shm_request('/shm/v1/admin/user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    fetchData(limit, offset, sortField, sortDirection);
  };

  const handleChangePassword = async (userId: number, password: string) => {
    await shm_request('/shm/v1/admin/user/passwd', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, password }),
    });
  };

  const handleDelete = async () => {
    if (!selectedRow?.user_id) return;
    
    await shm_request(`/shm/v1/admin/user/${selectedRow.user_id}`, {
      method: 'DELETE',
    });
    fetchData(limit, offset, sortField, sortDirection);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Пользователи</h2>
          <Help content="<b>Пользователи</b>: здесь отображается список пользователей. Можно фильтровать, скрывать/показывать столбцы, смотреть подробности." />
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
        sortField={sortField}
        sortDirection={sortDirection}
        onRowClick={handleRowClick}
        onRefresh={() => fetchData(limit, offset, sortField, sortDirection)}
        storageKey="users"
      />
      
      {/* Модалка редактирования */}
      <UserModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        data={selectedRow}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
        onChangePassword={handleChangePasswordOpen}
      />

      {/* Модалка создания */}
      <UserCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSaveNew}
      />

      {/* Модалка смены пароля */}
      <UserChangePasswordModal
        open={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        userId={selectedRow?.user_id}
        userLogin={selectedRow?.login}
        onSave={handleChangePassword}
      />
    </div>
  );
}

export default Users;
