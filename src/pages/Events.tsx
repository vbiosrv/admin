import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import EntityModal, { FieldConfig } from '../components/EntityModal';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';

const eventColumns = [
  { key: 'event_id', label: 'ID', visible: true, sortable: true },
  { key: 'name', label: 'Название', visible: true, sortable: true },
  { key: 'title', label: 'Заголовок', visible: true, sortable: true },
  { key: 'server_gid', label: 'Группа серверов', visible: true, sortable: true },
  { key: 'server_id', label: 'Сервер ID', visible: true, sortable: true },
];

const eventModalFields: FieldConfig[] = [
  { key: 'event_id', label: 'ID', copyable: true },
  { key: 'name', label: 'Название' },
  { key: 'title', label: 'Заголовок' },
  { key: 'server_gid', label: 'Группа серверов', linkTo: '/server-groups' },
  { key: 'server_id', label: 'ID сервера', linkTo: '/servers' },
  { key: 'settings', label: 'Настройки', type: 'json' },
];

function Events() {
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

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/service/event?limit=${l}&offset=${o}`;
    
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
    setOffset(0);
  }, []);

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold">События услуг</h2>
        <Help content="<b>События услуг</b>: список событий, связанных с услугами (подключение, отключение и т.д.)." />
      </div>
      <DataTable
        columns={eventColumns}
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
        storageKey="events"
      />
      <EntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Событие: ${selectedRow?.name || selectedRow?.event_id || ''}`}
        data={selectedRow}
        fields={eventModalFields}
      />
    </div>
  );
}

export default Events;
