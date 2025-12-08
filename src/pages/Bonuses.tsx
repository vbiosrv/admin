import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { BonusModal, BonusCreateModal } from '../modals';
import { Plus } from 'lucide-react';

const bonusColumns = [
  { key: 'bonus_id', label: 'ID', visible: true, sortable: true },
  { key: 'user_id', label: 'User ID', visible: true, sortable: true },
  { key: 'amount', label: 'Сумма', visible: true, sortable: true },
  { key: 'date', label: 'Дата', visible: true, sortable: true },
  { key: 'comment', label: 'Комментарий', visible: true, sortable: false },
];

function Bonuses() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/user/bonus?limit=${l}&offset=${o}`;
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
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Бонусы</h2>
          <Help content="<b>Бонусы</b>: история начисления бонусов пользователям." />
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-primary"
          title="Начислить бонус"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>
      <DataTable
        columns={bonusColumns}
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
        storageKey="bonuses"
      />
      <BonusModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={selectedRow}
      />
      <BonusCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={async (data) => {
          await shm_request(`/shm/v1/admin/user/bonus`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
          fetchData(limit, offset, sortField, sortDirection);
        }}
      />
    </div>
  );
}

export default Bonuses;
