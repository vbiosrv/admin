import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import EntityModal, { FieldConfig } from '../components/EntityModal';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { useSelectedUserStore } from '../store/selectedUserStore';

const spoolHistoryColumns = [
  { key: 'spool_id', label: 'ID', visible: true, sortable: true },
  { key: 'user_id', label: 'User ID', visible: true, sortable: true },
  { key: 'user_service_id', label: 'US ID', visible: true, sortable: true },
  { key: 'event', label: 'Событие', visible: true, sortable: true },
  { key: 'status', label: 'Статус', visible: true, sortable: true },
  { key: 'executed', label: 'Выполнено', visible: true, sortable: true },
  { key: 'response', label: 'Ответ', visible: true, sortable: false },
];

const modalFields: FieldConfig[] = [
  { key: 'spool_id', label: 'ID', copyable: true },
  { key: 'user_id', label: 'User ID', linkTo: '/users' },
  { key: 'user_service_id', label: 'US ID', linkTo: '/user-services' },
  { key: 'event', label: 'Событие' },
  { key: 'status', label: 'Статус', type: 'badge' },
  { key: 'executed', label: 'Выполнено', type: 'datetime' },
  { key: 'response', label: 'Ответ', type: 'json' },
  { key: 'settings', label: 'Настройки', type: 'json' },
];

function SpoolHistory() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
      
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
    let url = `/shm/v1/admin/spool/history?limit=${l}&offset=${o}`;
    
    // Добавляем фильтры в формате filter={"field":"%value%"}
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
  }, [limit, offset, filters, sortField, sortDirection]);

  const handlePageChange = (newLimit: number, newOffset: number) => {
    setLimit(newLimit);
    setOffset(newOffset);
  };

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(direction ? field : undefined);
    setSortDirection(direction);
    setOffset(0);
  };

  const handleFilterChange = useCallback((newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setOffset(0); // Сбрасываем offset при изменении фильтров
  }, []);

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold">Архив задач</h2>
        <Help content="<b>Архив задач</b>: история выполненных задач биллинга." />
      </div>
      <DataTable
        columns={spoolHistoryColumns}
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
        storageKey="spool-history"
        externalFilters={externalFilters}
      />
      <EntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Задача #${selectedRow?.spool_id || ''}`}
        data={selectedRow}
        fields={modalFields}
      />
    </div>
  );
}

export default SpoolHistory;
