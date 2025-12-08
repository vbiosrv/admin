import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import { UserServiceModal, UserServiceCreateModal } from '../modals';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { Plus } from 'lucide-react';

const userServiceColumns = [
  { key: 'user_service_id', label: 'ID', visible: true, sortable: true },
  { key: 'user_id', label: 'Пользователь', visible: true, sortable: true },
  { key: 'name', label: 'Услуга', visible: true, sortable: true },
  { key: 'status', label: 'Статус', visible: true, sortable: true },
  { key: 'created', label: 'Создано', visible: true, sortable: true },
  { key: 'expire', label: 'Истекает', visible: true, sortable: true },
  { key: 'category', label: 'Категория', visible: false, sortable: true },
  { key: 'auto_bill', label: 'Автобиллинг', visible: false, sortable: false },
  { key: 'next', label: 'След. услуга', visible: false, sortable: true },
  { key: 'parent', label: 'Родитель', visible: false, sortable: true },
];

function UserServices() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/user/service?limit=${l}&offset=${o}`;
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

  const handleSaveEdit = async (serviceData: any) => {
    await shm_request('/shm/v1/admin/user/service', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
    fetchData(limit, offset, sortField, sortDirection);
  };

  const handleSaveNew = async (serviceData: any) => {
    // Создание услуги через service/order
    await shm_request('/shm/v1/admin/service/order', {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
    fetchData(limit, offset, sortField, sortDirection);
  };

  const handleDelete = async () => {
    if (!selectedRow?.user_service_id) return;
    
    await shm_request(`/shm/v1/admin/user/service?user_service_id=${selectedRow.user_service_id}`, {
      method: 'DELETE',
    });
    fetchData(limit, offset, sortField, sortDirection);
  };

  const handleRefresh = () => {
    fetchData(limit, offset, sortField, sortDirection);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Услуги пользователей</h2>
          <Help content="<b>Услуги пользователей</b>: список всех услуг, привязанных к пользователям." />
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
        columns={userServiceColumns}
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
        onRefresh={handleRefresh}
        storageKey="user-services"
      />
      
      {/* Модалка редактирования */}
      <UserServiceModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedRow(null);
        }}
        data={editModalOpen ? selectedRow : null}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
        onRefresh={handleRefresh}
      />

      {/* Модалка создания */}
      <UserServiceCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSaveNew}
      />
    </div>
  );
}

export default UserServices;
