import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import DataTable, { SortDirection } from '../components/DataTable';
import { UserServiceModal } from '../modals';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { buildApiFilters, appendFilterToUrl } from '../lib/filterUtils';
import { Plus, User, X, Send, FileText, Image as ImageIcon, Paperclip } from 'lucide-react';

// CSS для пульсирующей анимации открытых тикетов
const pulseAnimation = `
@keyframes ticket-pulse {
  0%, 100% {
    box-shadow: inset 0 0 0 2px rgba(34, 197, 94, 0.4);
  }
  50% {
    box-shadow: inset 0 0 0 2px rgba(34, 197, 94, 0.8), inset 0 0 20px rgba(34, 197, 94, 0.1);
  }
}
.ticket-row-open {
  animation: ticket-pulse 2s ease-in-out infinite;
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.05) 0%, transparent 50%, rgba(34, 197, 94, 0.05) 100%) !important;
}
`;

// Добавляем стили в head
if (typeof document !== 'undefined') {
  const styleId = 'ticket-pulse-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = pulseAnimation;
    document.head.appendChild(style);
  }
}

interface Ticket {
  ticket_id: number;
  user_id: number;
  category_id: number | null;
  subject: string;
  status: string;
  priority: string;
  ticket_type: string;
  user_service_id: number | null;
  created: string;
  updated: string;
  closed_at: string | null;
  archived_at: string | null;
  assigned_to: number | null;
}

interface MediaFile {
  name: string;
  type: string;
  size: number;
  data?: string;
  url?: string;
}

interface TicketMessage {
  message_id: number;
  ticket_id: number;
  user_id: number;
  admin_id: number | null;
  is_admin: number;
  message: string;
  media?: MediaFile[];
  created: string;
}

interface TicketFull extends Ticket {
  messages: TicketMessage[];
  user: {
    user_id: number;
    login: string;
    balance: number;
    bonus: number;
    created: string;
  };
}

const statusLabels: Record<string, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  waiting: 'Ожидание',
  closed: 'Закрыт',
  archived: 'В архиве',
};

const statusColors: Record<string, string> = {
  open: 'bg-green-500/20 text-green-400 border-green-500/30',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  waiting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  archived: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const priorityLabels: Record<string, string> = {
  low: 'Низкий',
  normal: 'Обычный',
  high: 'Высокий',
  urgent: 'Срочный',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const ticketTypeLabels: Record<string, string> = {
  service: 'Услуга',
  payment: 'Платёж',
  other: 'Другое',
};

const ticketTypeColors: Record<string, string> = {
  service: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  payment: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const ticketColumns = [
  { key: 'ticket_id', label: 'ID', visible: true, sortable: true },
  { key: 'subject', label: 'Тема', visible: true, sortable: true },
  { key: 'user_id', label: 'Пользователь', visible: true, sortable: true },
  {
    key: 'ticket_type',
    label: 'Тип',
    visible: true,
    sortable: true,
    render: (value: string) => (
      <span className={`px-2 py-1 rounded text-xs border ${ticketTypeColors[value] || ''}`}>
        {ticketTypeLabels[value] || value}
      </span>
    ),
  },
  {
    key: 'user_service_id',
    label: 'Услуга',
    visible: true,
    sortable: true,
    render: (value: number | null) => value ? `#${value}` : '-',
  },
  {
    key: 'status',
    label: 'Статус',
    visible: true,
    sortable: true,
    render: (value: string) => (
      <span className={`px-2 py-1 rounded text-xs border ${statusColors[value] || ''}`}>
        {statusLabels[value] || value}
      </span>
    ),
  },
  {
    key: 'priority',
    label: 'Приоритет',
    visible: true,
    sortable: true,
    render: (value: string) => (
      <span className={`px-2 py-1 rounded text-xs border ${priorityColors[value] || ''}`}>
        {priorityLabels[value] || value}
      </span>
    ),
  },
  { key: 'created', label: 'Создан', visible: true, sortable: true },
  { key: 'updated', label: 'Обновлён', visible: false, sortable: true },
];

function Tickets() {
  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<'like' | 'exact'>('exact');

  const [selectedTicket, setSelectedTicket] = useState<TicketFull | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [newMessage, setNewMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; type: string; size: number; data: string }>>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Форма создания тикета
  const [newTicket, setNewTicket] = useState({
    user_id: '',
    subject: '',
    message: '',
    priority: 'normal',
    ticket_type: 'other',
    user_service_id: '',
  });

  // Модалка услуги
  const [userServiceModalOpen, setUserServiceModalOpen] = useState(false);
  const [selectedUserService, setSelectedUserService] = useState<any>(null);

  // Модалка просмотра медиа
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: string; name: string } | null>(null);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, fm: 'like' | 'exact', sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `shm/v1/admin/ticket?limit=${l}&offset=${o}`;

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

  const handleRefresh = useCallback(() => {
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  }, [fetchData, limit, offset, filters, filterMode, sortField, sortDirection]);

  useEffect(() => {
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  }, [limit, offset, filters, filterMode, sortField, sortDirection]);

  const handlePageChange = (newLimit: number, newOffset: number) => {
    setLimit(newLimit);
    setOffset(newOffset);
  };

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handleFilterChange = (newFilters: Record<string, string>, mode: 'like' | 'exact') => {
    setFilters(newFilters);
    setFilterMode(mode);
    setOffset(0);
  };

  const openTicket = (ticket: Ticket) => {
    shm_request(`shm/v1/admin/ticket/${ticket.ticket_id}`)
      .then(res => {
        const { data: items } = normalizeListResponse(res);
        if (items.length > 0) {
          setSelectedTicket(items[0]);
          setTicketModalOpen(true);
        }
      })
      .catch(() => toast.error('Ошибка загрузки тикета'));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast.error(`Файл ${file.name} слишком большой (макс. 5 МБ)`);
        continue;
      }

      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const isAllowedExt = allowedExtensions.includes(ext);
      const isAllowedType = imageTypes.includes(file.type) || file.type === 'application/pdf';

      if (!isAllowedExt && !isAllowedType) {
        toast.error(`Тип файла ${file.name} не поддерживается`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachedFiles(prev => [...prev, {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
        }]);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || (!newMessage.trim() && attachedFiles.length === 0)) return;

    setSendingMessage(true);
    try {
      const payload: { message: string; media?: typeof attachedFiles } = {
        message: newMessage || (attachedFiles.length > 0 ? '[Файл]' : ''),
      };
      if (attachedFiles.length > 0) {
        payload.media = attachedFiles;
      }
      await shm_request(`shm/v1/admin/ticket/${selectedTicket.ticket_id}/message`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Перезагружаем тикет
      const res = await shm_request(`shm/v1/admin/ticket/${selectedTicket.ticket_id}`);
      const { data: items } = normalizeListResponse(res);
      if (items.length > 0) {
        setSelectedTicket(items[0]);
      }

      setNewMessage('');
      setAttachedFiles([]);
      toast.success('Сообщение отправлено');
      fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
    } catch (e) {
      toast.error('Ошибка отправки сообщения');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedTicket) return;

    try {
      await shm_request(`shm/v1/admin/ticket/${selectedTicket.ticket_id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: status }),
      });

      // Перезагружаем тикет
      const res = await shm_request(`shm/v1/admin/ticket/${selectedTicket.ticket_id}`);
      const { data: items } = normalizeListResponse(res);
      if (items.length > 0) {
        setSelectedTicket(items[0]);
      }

      toast.success('Статус изменён');
      fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
    } catch (e) {
      toast.error('Ошибка изменения статуса');
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.user_id || !newTicket.subject || !newTicket.message) {
      toast.error('Заполните обязательные поля');
      return;
    }

    try {
      await shm_request('shm/v1/admin/ticket', {
        method: 'PUT',
        body: JSON.stringify({
          user_id: parseInt(newTicket.user_id),
          subject: newTicket.subject,
          message: newTicket.message,
          priority: newTicket.priority,
          ticket_type: newTicket.ticket_type,
          user_service_id: newTicket.user_service_id ? parseInt(newTicket.user_service_id) : null,
        }),
      });

      toast.success('Тикет создан');
      setCreateModalOpen(false);
      setNewTicket({ user_id: '', subject: '', message: '', priority: 'normal', ticket_type: 'other', user_service_id: '' });
      fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
    } catch (e) {
      toast.error('Ошибка создания тикета');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-content-text)' }}>
            Тикеты
          </h1>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          style={{
            backgroundColor: 'var(--theme-accent)',
            color: 'white',
          }}
        >
          <Plus className="w-4 h-4" />
          Создать тикет
        </button>
      </div>

      <DataTable
        storageKey="tickets"
        columns={ticketColumns}
        data={data}
        loading={loading}
        total={total}
        limit={limit}
        offset={offset}
        onPageChange={handlePageChange}
        onSort={handleSort}
        sortField={sortField}
        sortDirection={sortDirection}
        onFilterChange={handleFilterChange}
        onRowClick={openTicket}
        onRefresh={handleRefresh}
        rowClassName={(row) => row.status === 'open' ? 'ticket-row-open' : ''}
      />

      {/* Модалка просмотра тикета */}
      {ticketModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl flex flex-col"
            style={{ backgroundColor: 'var(--theme-card-bg)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--theme-border-color)' }}
            >
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                  #{selectedTicket.ticket_id}: {selectedTicket.subject}
                </h2>
                <span className={`px-2 py-1 rounded text-xs border ${statusColors[selectedTicket.status] || ''}`}>
                  {statusLabels[selectedTicket.status] || selectedTicket.status}
                </span>
              </div>
              <button
                onClick={() => setTicketModalOpen(false)}
                className="p-1 rounded hover:bg-gray-700"
              >
                <X className="w-5 h-5" style={{ color: 'var(--theme-content-text-muted)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Messages */}
              <div className="flex-1 flex flex-col border-r" style={{ borderColor: 'var(--theme-border-color)' }}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedTicket.messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`p-3 rounded-lg ${msg.is_admin ? 'ml-8 bg-blue-500/10' : 'mr-8'}`}
                      style={!msg.is_admin ? { backgroundColor: 'var(--theme-sidebar-bg)' } : {}}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium" style={{ color: msg.is_admin ? '#60a5fa' : 'var(--theme-content-text-muted)' }}>
                          {msg.is_admin ? 'Поддержка' : `Пользователь #${msg.user_id}`}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                          {msg.created}
                        </span>
                      </div>
                      {/* Media attachments */}
                      {msg.media && msg.media.length > 0 && (
                        <div className="mb-2 space-y-2">
                          {msg.media.map((file, idx) => {
                            const isImage = file.type?.startsWith('image/');
                            const dataUrl = file.url || (file.data ? `data:${file.type};base64,${file.data}` : null);

                            if (isImage && dataUrl) {
                              return (
                                <img
                                  key={idx}
                                  src={dataUrl}
                                  alt={file.name}
                                  className="max-w-xs rounded-lg border cursor-pointer hover:opacity-90"
                                  style={{ borderColor: 'var(--theme-border-color)' }}
                                  onClick={() => {
                                    setPreviewMedia({ url: dataUrl, type: 'image', name: file.name });
                                    setMediaPreviewOpen(true);
                                  }}
                                />
                              );
                            }

                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 rounded border"
                                style={{
                                  backgroundColor: 'var(--theme-input-bg)',
                                  borderColor: 'var(--theme-border-color)',
                                }}
                              >
                                <FileText className="w-4 h-4" style={{ color: 'var(--theme-content-text-muted)' }} />
                                <span className="text-sm" style={{ color: 'var(--theme-content-text)' }}>
                                  {file.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--theme-content-text)' }}>
                        {msg.message !== '[Файл]' ? msg.message : ''}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Reply form */}
                <div className="p-4 border-t" style={{ borderColor: 'var(--theme-border-color)' }}>
                  {/* Attached files preview */}
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {attachedFiles.map((file, index) => {
                        const isImage = file.type.startsWith('image/');
                        return (
                          <div
                            key={index}
                            className="relative p-1 rounded border"
                            style={{
                              backgroundColor: 'var(--theme-input-bg)',
                              borderColor: 'var(--theme-border-color)',
                            }}
                          >
                            <button
                              onClick={() => removeFile(index)}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs"
                              style={{ backgroundColor: 'var(--theme-accent)', color: 'white' }}
                            >
                              ×
                            </button>
                            {isImage ? (
                              <img
                                src={`data:${file.type};base64,${file.data}`}
                                alt={file.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 flex flex-col items-center justify-center">
                                <FileText className="w-4 h-4" style={{ color: 'var(--theme-content-text-muted)' }} />
                                <span className="text-xs truncate max-w-[48px]" style={{ color: 'var(--theme-content-text-muted)' }}>
                                  {file.name.split('.').pop()}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: 'var(--theme-border-color)',
                        color: 'var(--theme-content-text-muted)',
                      }}
                      title="Прикрепить файл"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Введите ответ..."
                      className="flex-1 px-3 py-2 rounded-lg border resize-none"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: 'var(--theme-border-color)',
                        color: 'var(--theme-content-text)',
                      }}
                      rows={2}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || (!newMessage.trim() && attachedFiles.length === 0)}
                      className="px-4 py-2 rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--theme-accent)', color: 'white' }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-72 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {/* User info */}
                  <div>
                    <h3 className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Пользователь
                    </h3>
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--theme-sidebar-bg)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
                        <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                          {selectedTicket.user?.login || `#${selectedTicket.user_id}`}
                        </span>
                      </div>
                      {selectedTicket.user && (
                        <div className="text-xs space-y-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                          <p>Баланс: {selectedTicket.user.balance}</p>
                          <p>Бонусы: {selectedTicket.user.bonus}</p>
                          <p>Создан: {selectedTicket.user.created}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Информация
                    </h3>
                    <div className="space-y-2 text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                      <p>Создан: {selectedTicket.created}</p>
                      <p>Обновлён: {selectedTicket.updated}</p>
                      <p>Приоритет: <span className={priorityColors[selectedTicket.priority]}>{priorityLabels[selectedTicket.priority]}</span></p>
                      <p>Тип: <span className={ticketTypeColors[selectedTicket.ticket_type]}>{ticketTypeLabels[selectedTicket.ticket_type] || selectedTicket.ticket_type}</span></p>
                    </div>
                  </div>

                  {/* Услуга */}
                  {selectedTicket.user_service_id && (
                    <div>
                      <h3 className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                        Связанная услуга
                      </h3>
                      <button
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors border"
                        style={{
                          backgroundColor: 'var(--accent-primary)',
                          color: 'var(--accent-text)',
                          borderColor: 'var(--accent-primary)',
                        }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await shm_request(`shm/v1/admin/user/service?user_service_id=${selectedTicket.user_service_id}&limit=1`);
                            const { data: items } = normalizeListResponse(res);
                            if (items.length > 0) {
                              setSelectedUserService(items[0]);
                              setUserServiceModalOpen(true);
                            } else {
                              toast.error('Услуга не найдена');
                            }
                          } catch (error) {
                            toast.error('Ошибка загрузки услуги');
                          }
                        }}
                      >
                        Открыть услугу #{selectedTicket.user_service_id}
                      </button>
                    </div>
                  )}

                  {/* Status change */}
                  <div>
                    <h3 className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Изменить статус
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => handleStatusChange(value)}
                          disabled={selectedTicket.status === value}
                          className={`px-2 py-1 rounded text-xs border disabled:opacity-50 ${statusColors[value] || ''}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка создания тикета */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-lg rounded-lg shadow-xl"
            style={{ backgroundColor: 'var(--theme-card-bg)' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--theme-border-color)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                Создать тикет
              </h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded hover:bg-gray-700"
              >
                <X className="w-5 h-5" style={{ color: 'var(--theme-content-text-muted)' }} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-content-text)' }}>
                  ID пользователя *
                </label>
                <input
                  type="number"
                  value={newTicket.user_id}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border-color)',
                    color: 'var(--theme-content-text)',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-content-text)' }}>
                  Тема *
                </label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border-color)',
                    color: 'var(--theme-content-text)',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-content-text)' }}>
                  Приоритет
                </label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border-color)',
                    color: 'var(--theme-content-text)',
                  }}
                >
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-content-text)' }}>
                  Сообщение *
                </label>
                <textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border resize-none"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border-color)',
                    color: 'var(--theme-content-text)',
                  }}
                  rows={4}
                />
              </div>
            </div>

            <div
              className="flex justify-end gap-2 px-6 py-4 border-t"
              style={{ borderColor: 'var(--theme-border-color)' }}
            >
              <button
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg border"
                style={{
                  borderColor: 'var(--theme-border-color)',
                  color: 'var(--theme-content-text)',
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleCreateTicket}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--theme-accent)', color: 'white' }}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка услуги */}
      <UserServiceModal
        open={userServiceModalOpen}
        onClose={() => {
          setUserServiceModalOpen(false);
          setSelectedUserService(null);
        }}
        data={selectedUserService}
        onSave={async (serviceData) => {
          await shm_request('shm/v1/admin/user/service', {
            method: 'POST',
            body: JSON.stringify(serviceData),
          });
        }}
      />

      {/* Модалка просмотра медиа */}
      {mediaPreviewOpen && previewMedia && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={() => setMediaPreviewOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setMediaPreviewOpen(false)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img
              src={previewMedia.url}
              alt={previewMedia.name}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-center text-white text-sm mt-2 opacity-70">
              {previewMedia.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tickets;
