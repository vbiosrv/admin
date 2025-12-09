import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import EntityModal, { FieldConfig } from '../components/EntityModal';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';

const serverGroupColumns = [
  { key: 'group_id', label: 'ID', visible: true, sortable: true },
  { key: 'name', label: 'Название', visible: true, sortable: true },
  { key: 'type', label: 'Тип', visible: true, sortable: true },
  { key: 'transport', label: 'Транспорт', visible: true, sortable: true },
];

const serverGroupModalFields: FieldConfig[] = [
  { key: 'group_id', label: 'ID', copyable: true },
  { key: 'name', label: 'Название' },
  { key: 'type', label: 'Тип' },
  { key: 'transport', label: 'Транспорт' },
  { key: 'settings', label: 'Настройки', type: 'json' },
];

function ServerGroups() {
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
    let url = `/shm/v1/admin/server/group?limit=${l}&offset=${o}`;
    
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
        <h2 className="text-xl font-bold">Группы серверов</h2>
        <Help content="<b>Группы серверов</b>: логические группы серверов для распределения услуг." />
      </div>
      <DataTable
        columns={serverGroupColumns}
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
        storageKey="server-groups"
      />
      <EntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Группа: ${selectedRow?.name || selectedRow?.group_id || ''}`}
        data={selectedRow}
        fields={serverGroupModalFields}
      />
    </div>
  );
}

export default ServerGroups;
