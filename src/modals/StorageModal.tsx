import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Download, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import UserSelect from '../components/UserSelect';
import JsonEditor from '../components/JsonEditor';
import ConfirmModal from '../components/ConfirmModal';

interface StorageModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onDelete?: (name: string) => void | Promise<void>;
}

export default function StorageModal({
  open,
  onClose,
  data,
  onDelete,
}: StorageModalProps) {
  const [viewData, setViewData] = useState<Record<string, any>>({});
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Синхронизация данных при открытии
  useEffect(() => {
    if (data) {
      setViewData({ ...data });
      // Проверяем, является ли data JSON-объектом
      try {
        if (data.data && typeof data.data === 'object') {
          setIsJsonMode(true);
        } else {
          setIsJsonMode(false);
        }
      } catch {
        setIsJsonMode(false);
      }
    } else {
      setViewData({});
      setIsJsonMode(false);
    }
  }, [data, open]);

  const handleDownload = () => {
    if (!viewData.data) return;

    try {
      const content = isJsonMode
        ? JSON.stringify(viewData.data, null, 2)
        : String(viewData.data);
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${viewData.name || 'storage'}.${isJsonMode ? 'json' : 'txt'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Файл скачан');
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      toast.error('Ошибка скачивания');
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !viewData.name) return;

    setDeleting(true);
    try {
      await onDelete(viewData.name);
      setConfirmDeleteOpen(false);
      onClose();
      toast.success('Запись удалена');
    } catch (error) {
      console.error('Ошибка удаления:', error);
      toast.error('Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  const labelStyles = {
    color: 'var(--theme-content-text-muted)',
  };

  const renderFooter = () => (
    <div className="flex justify-between items-center w-full">
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          className="px-4 py-2 rounded flex items-center gap-2 btn-primary"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
        >
          <Download className="w-4 h-4" />
          Скачать
        </button>
        {onDelete && (
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="px-4 py-2 rounded flex items-center gap-2 btn-danger"
            style={{
              backgroundColor: 'var(--theme-button-danger-bg)',
              color: 'var(--theme-button-danger-text)',
              border: '1px solid var(--theme-button-danger-border)',
            }}
          >
            <Trash2 className="w-4 h-4" />
            Удалить
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className="px-4 py-2 rounded flex items-center gap-2"
        style={{
          backgroundColor: 'var(--theme-button-secondary-bg)',
          color: 'var(--theme-button-secondary-text)',
          border: '1px solid var(--theme-button-secondary-border)',
        }}
      >
        <X className="w-4 h-4" />
        Закрыть
      </button>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Просмотр хранилища: ${viewData.name || ''}`}
        footer={renderFooter()}
        size="lg"
      >
        <div className="space-y-4">
          {/* Пользователь */}
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Пользователь
            </label>
            <div className="flex-1">
              <UserSelect
                value={viewData.user_id}
                onChange={() => {}}
                readonly
              />
            </div>
          </div>

          {/* Название */}
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Название
            </label>
            <input
              type="text"
              value={viewData.name || ''}
              readOnly
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>

          {/* Данные */}
          <div className="flex items-start gap-3">
            <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
              Данные
            </label>
            <div className="flex-1">
              {isJsonMode ? (
                <div className="border rounded" style={{ borderColor: inputStyles.borderColor }}>
                  <JsonEditor
                    data={viewData.data}
                    onChange={() => {}}
                    readonly
                  />
                </div>
              ) : (
                <textarea
                  value={viewData.data || ''}
                  readOnly
                  rows={10}
                  className="w-full px-3 py-2 text-sm rounded border resize-none opacity-60"
                  style={inputStyles}
                />
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Модалка подтверждения удаления */}
      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Удалить запись?"
        message={`Вы уверены, что хотите удалить запись "${viewData.name}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
        confirmWord="delete"
        confirmWordHint='Введите "delete" для подтверждения'
      />
    </>
  );
}
