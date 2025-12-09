import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import EntityModal, { FieldConfig } from '../components/EntityModal';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { useSelectedUserStore } from '../store/selectedUserStore';

const spoolColumns = [
  { key: 'id', label: 'ID', visible: true, sortable: true },
  { key: 'user_id', label: 'Пользователь', visible: true, sortable: true },
  { key: 'user_service_id', label: 'Услуга', visible: true, sortable: true },
  { key: 'status', label: 'Статус', visible: true, sortable: true },
  { key: 'prio', label: 'Приоритет', visible: true, sortable: true },
  { key: 'created', label: 'Создано', visible: true, sortable: true },
  { key: 'executed', label: 'Выполнено', visible: false, sortable: true },
  { key: 'delayed', label: 'Задержка', visible: false, sortable: true },
];

const modalFields: FieldConfig[] = [
  { key: 'id', label: 'ID', copyable: true },
  { key: 'user_id', label: 'Пользователь', linkTo: '/users' },
  { key: 'user_service_id', label: 'Услуга', linkTo: '/user-services' },
  { key: 'status', label: 'Статус', type: 'badge' },
  { key: 'prio', label: 'Приоритет' },
  { key: 'created', label: 'Создано', type: 'datetime' },
  { key: 'executed', label: 'Выполнено', type: 'datetime' },
  { key: 'delayed', label: 'Задержка' },
  { key: 'event', label: 'Событие' },
  { key: 'settings', label: 'Настройки', type: 'json' },
];

function Spool() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
    
  // Получаем выбранного пользователя из store
  const { selectedUser } = useSelectedUserStore();
    
  // Формируем externalFilters для автоматического заполнения поля user_id
  const externalFilters = useMemo(() => {
    if (selectedUser?.user_id) {
      return { user_id: String(selectedUser.user_id) };
    }
    return undefined;
  }, [selectedUser]);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/spool?limit=${l}&offset=${o}`;
    
    if (Object.keys(f).length > 0) {
      url += `&filter=${encodeURIComponent(JSON.stringify(f))}`;
    }
    
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
    fetchData(limit, offset, filters, sortField, sortDirection);
  }, [limit, offset, filters, sortField, sortDirection, fetchData]);

  const handlePageChange = (newLimit: number, newOffset: number) => {
    setLimit(newLimit);
    setOffset(newOffset);
  };

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(direction ? field : undefined);
    setSortDirection(direction);
    setOffset(0);
  };

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setOffset(0);
  };

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold">Задачи (Spool)</h2>
        <Help content="<b>Задачи</b>: список текущих задач биллинга. Можно перейти к пользователю или услуге." />
      </div>
      <DataTable
        columns={spoolColumns}
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
        onRefresh={() => fetchData(limit, offset, filters, sortField, sortDirection)}
        storageKey="spool"
        externalFilters={externalFilters}
      />
      <EntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Задача #${selectedRow?.id || ''}`}
        data={selectedRow}
        fields={modalFields}
      />
    </div>
  );
}

export default Spool;
