import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import EntityModal, { FieldConfig } from '../components/EntityModal';
import { shm_request, normalizeListResponse } from '../lib/shm_request';

const configColumns = [
  { key: 'key', label: 'Ключ', visible: true, sortable: true },
  { key: 'value', label: 'Значение', visible: true, sortable: false },
];

const modalFields: FieldConfig[] = [
  { key: 'key', label: 'Ключ', copyable: true },
  { key: 'value', label: 'Значение', type: 'json' },
];

function Config() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/config?limit=${l}&offset=${o}`;
    
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
        <h2 className="text-xl font-bold">Конфигурация</h2>
        <Help content="<b>Конфигурация</b>: системные настройки биллинга. Можно редактировать значения через JSON Editor." />
      </div>
      <DataTable
        columns={configColumns}
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
        onRefresh={() => fetchData(limit, offset, filters, sortField, sortDirection)}
        height="calc(100vh - 220px)"
        onRowClick={handleRowClick}
        storageKey="config"
      />
      <EntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Конфигурация: ${selectedRow?.key || ''}`}
        data={selectedRow}
        fields={modalFields}
      />
    </div>
  );
}

export default Config;
