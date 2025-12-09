import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  RefreshCw, 
  X, 
  Columns, 
  GripVertical, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  FilterX,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  Timer
} from 'lucide-react';

interface Column {
  key: string;
  label: string;
  visible: boolean;
  width?: number;
  sortable?: boolean;
}

export type SortDirection = 'asc' | 'desc' | null;

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  total?: number;
  limit: number;
  offset: number;
  onPageChange: (limit: number, offset: number) => void;
  onRowClick?: (row: any) => void;
  onRefresh?: () => void;
  onSort?: (field: string, direction: SortDirection) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  sortField?: string;
  sortDirection?: SortDirection;
  height?: string;
  /** Уникальный ключ для сохранения настроек в localStorage */
  storageKey?: string;
  /** Внешние фильтры для программного управления */
  externalFilters?: Record<string, string>;
}

const LIMITS = [50, 100, 500, 1000, 5000];
const MIN_COLUMN_WIDTH = 20;
const DEFAULT_COLUMN_WIDTH = 150;
const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: 'Выкл' },
  { value: 3, label: '3 сек' },
  { value: 5, label: '5 сек' },
  { value: 10, label: '10 сек' },
  { value: 30, label: '30 сек' },
];

// Интерфейс для сохраняемых настроек
interface StoredSettings {
  columns: { key: string; visible: boolean; width: number }[];
  autoRefresh: number;
}

// Функция загрузки настроек из localStorage
function loadSettings(storageKey: string): StoredSettings | null {
  try {
    const stored = localStorage.getItem(`dataTable_${storageKey}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading DataTable settings:', e);
  }
  return null;
}

// Функция сохранения настроек в localStorage
function saveSettings(storageKey: string, settings: StoredSettings) {
  try {
    localStorage.setItem(`dataTable_${storageKey}`, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving DataTable settings:', e);
  }
}

// Функция для форматирования значений ячеек (объекты преобразуем в JSON-строку)
function formatCellValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

function DataTable({ 
  columns: initialColumns, 
  data, 
  loading, 
  total = 0, 
  limit, 
  offset, 
  onPageChange, 
  onRowClick,
  onRefresh,
  onSort,
  onFilterChange,
  sortField,
  sortDirection,
  height = '500px',
  storageKey,
  externalFilters
}: DataTableProps) {
  // Инициализация колонок с учётом сохранённых настроек
  const [columns, setColumns] = useState<Column[]>(() => {
    const defaultColumns = initialColumns.map(col => ({ 
      ...col, 
      width: col.width || DEFAULT_COLUMN_WIDTH 
    }));
    
    if (!storageKey) return defaultColumns;
    
    const stored = loadSettings(storageKey);
    if (!stored) return defaultColumns;
    
    // Применяем сохранённые настройки (порядок, видимость, ширина)
    const storedMap = new Map(stored.columns.map(c => [c.key, c]));
    const result: Column[] = [];
    
    // Сначала добавляем колонки в сохранённом порядке
    for (const storedCol of stored.columns) {
      const initialCol = defaultColumns.find(c => c.key === storedCol.key);
      if (initialCol) {
        result.push({
          ...initialCol,
          visible: storedCol.visible,
          width: storedCol.width,
        });
      }
    }
    
    // Добавляем новые колонки, которых не было в сохранённых настройках
    for (const col of defaultColumns) {
      if (!storedMap.has(col.key)) {
        result.push(col);
      }
    }
    
    return result;
  });
  
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showColumns, setShowColumns] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  
  // Инициализация автообновления с учётом сохранённых настроек
  const [autoRefresh, setAutoRefresh] = useState(() => {
    if (!storageKey) return 0;
    const stored = loadSettings(storageKey);
    return stored?.autoRefresh ?? 0;
  });
  
  const [showAutoRefreshMenu, setShowAutoRefreshMenu] = useState(false);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const columnsDropdownRef = useRef<HTMLDivElement>(null);
  const autoRefreshRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const prevExternalFiltersKeys = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true); // Отслеживаем первую загрузку
  const filterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Debounce для фильтров
  const onRefreshRef = useRef(onRefresh); // Храним актуальную версию onRefresh
  const prevFormattedFiltersRef = useRef<string>(''); // Храним предыдущие отформатированные фильтры

  // Обновляем ref при изменении onRefresh
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Синхронизация внешних фильтров с внутренними
  useEffect(() => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      
      // Удаляем предыдущие внешние фильтры
      prevExternalFiltersKeys.current.forEach(key => {
        if (!externalFilters || !(key in externalFilters)) {
          delete newFilters[key];
        }
      });
      
      // Добавляем новые внешние фильтры
      if (externalFilters) {
        Object.assign(newFilters, externalFilters);
        prevExternalFiltersKeys.current = new Set(Object.keys(externalFilters));
      } else {
        prevExternalFiltersKeys.current.clear();
      }
      
      return newFilters;
    });
  }, [externalFilters]);

  // Вызов onFilterChange с debounce при изменении фильтров
  useEffect(() => {
    if (!onFilterChange) return;
    
    // Очищаем предыдущий таймер
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }
    
    // Устанавливаем новый таймер (1 секунда как в старой версии)
    filterTimeoutRef.current = setTimeout(() => {
      // Формируем фильтры в формате %value% (как в старой версии)
      const formattedFilters: Record<string, string> = {};
      Object.entries(columnFilters).forEach(([key, value]) => {
        if (value) {
          formattedFilters[key] = `%${value}%`;
        }
      });
      
      // Проверяем, изменились ли фильтры
      const filtersString = JSON.stringify(formattedFilters);
      if (filtersString !== prevFormattedFiltersRef.current) {
        prevFormattedFiltersRef.current = filtersString;
        onFilterChange(formattedFilters);
      }
    }, 1000);
    
    // Очистка при размонтировании
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [columnFilters, onFilterChange]);

  // Отслеживаем окончание первой загрузки
  useEffect(() => {
    if (!loading && isFirstLoad.current) {
      isFirstLoad.current = false;
    }
  }, [loading]);

  // Сохранение настроек в localStorage при изменении колонок или автообновления
  useEffect(() => {
    // Пропускаем первый рендер (настройки только что загружены)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (!storageKey) return;
    
    const settings: StoredSettings = {
      columns: columns.map(col => ({
        key: col.key,
        visible: col.visible,
        width: col.width || DEFAULT_COLUMN_WIDTH,
      })),
      autoRefresh,
    };
    
    saveSettings(storageKey, settings);
  }, [columns, autoRefresh, storageKey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) {
        setShowColumns(false);
      }
      if (autoRefreshRef.current && !autoRefreshRef.current.contains(e.target as Node)) {
        setShowAutoRefreshMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto refresh
  useEffect(() => {
    if (autoRefresh > 0) {
      const interval = setInterval(() => {
        if (onRefreshRef.current) {
          onRefreshRef.current();
        }
      }, autoRefresh * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Column resizing handlers - используем ref для мгновенного обновления
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const wasResizingRef = useRef(false);
  
  const handleResizeStart = useCallback((e: React.MouseEvent, key: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startWidth: currentWidth };
    setResizingColumn(key);
  }, []);

  useEffect(() => {
    if (!resizingColumn || !resizingRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      
      const { key, startX, startWidth } = resizingRef.current;
      const diff = e.clientX - startX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + diff);
      
      // Обновляем напрямую через DOM для мгновенной реакции
      const cells = document.querySelectorAll(`[data-column-key="${key}"]`);
      cells.forEach(cell => {
        (cell as HTMLElement).style.width = `${newWidth}px`;
        (cell as HTMLElement).style.minWidth = `${newWidth}px`;
        (cell as HTMLElement).style.maxWidth = `${newWidth}px`;
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      
      const { key, startX, startWidth } = resizingRef.current;
      const diff = e.clientX - startX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + diff);
      
      // Обновляем state только при отпускании мыши
      setColumns(cols => cols.map(col =>
        col.key === key ? { ...col, width: newWidth } : col
      ));
      
      resizingRef.current = null;
      setResizingColumn(null);
      
      // Блокируем сортировку на короткое время после ресайза
      wasResizingRef.current = true;
      setTimeout(() => {
        wasResizingRef.current = false;
      }, 100);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  // Обработчик сортировки с проверкой на ресайз
  const handleSortClick = useCallback((col: Column) => {
    if (wasResizingRef.current) return;
    if (col.sortable === false || !onSort) return;
    
    const newDirection: SortDirection = 
      sortField === col.key 
        ? (sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc')
        : 'asc';
    onSort(col.key, newDirection);
  }, [sortField, sortDirection, onSort]);

  // Drag and drop for column reordering
  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDraggedColumn(key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetKey) return;

    setColumns(cols => {
      const newCols = [...cols];
      const draggedIdx = newCols.findIndex(c => c.key === draggedColumn);
      const targetIdx = newCols.findIndex(c => c.key === targetKey);
      const [removed] = newCols.splice(draggedIdx, 1);
      newCols.splice(targetIdx, 0, removed);
      return newCols;
    });
    setDraggedColumn(null);
  };

  // Column visibility toggle
  const toggleColumn = (key: string) => {
    setColumns(cols => cols.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({});
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(columnFilters).some(v => v);

  // Pagination
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  const goToPage = (page: number) => {
    const newOffset = (page - 1) * limit;
    onPageChange(limit, newOffset);
  };

  const changeLimit = (newLimit: number) => {
    onPageChange(newLimit, 0);
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div 
      className="rounded-lg overflow-hidden"
      style={{ 
        backgroundColor: 'var(--theme-card-bg)',
        border: '1px solid var(--theme-card-border)',
      }}
    >
      {/* Toolbar */}
      <div 
        className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between"
        style={{ borderBottom: '1px solid var(--theme-card-border)' }}
      >
        <div className="flex gap-2 items-center">
          {hasActiveFilters && (
            <span 
              className="text-xs px-2 py-1 rounded-full"
              style={{ 
                backgroundColor: 'var(--theme-primary-color)',
                color: 'white',
              }}
            >
              Фильтры активны
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {/* Clear filters button */}
          <button 
            onClick={clearAllFilters}
            className="btn-icon"
            title="Очистить фильтры"
            disabled={!hasActiveFilters}
            style={{ opacity: hasActiveFilters ? 1 : 0.5 }}
          >
            <FilterX className="w-4 h-4" />
          </button>

          {/* Refresh button */}
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="btn-icon"
              title="Обновить"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Auto refresh dropdown */}
          {onRefresh && (
            <div className="relative" ref={autoRefreshRef}>
              <button 
                onClick={() => setShowAutoRefreshMenu(!showAutoRefreshMenu)}
                className="btn-icon flex items-center gap-1"
                title="Автообновление"
                style={{ 
                  color: autoRefresh > 0 ? 'var(--accent-primary)' : undefined,
                }}
              >
                <Timer className="w-4 h-4" />
                <span className="text-xs">{autoRefresh > 0 ? `${autoRefresh}с` : ''}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showAutoRefreshMenu ? 'rotate-180' : ''}`} />
              </button>

              {showAutoRefreshMenu && (
                <div 
                  className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-xl overflow-hidden min-w-[100px]"
                  style={{
                    backgroundColor: 'var(--theme-card-bg)',
                    border: '1px solid var(--theme-card-border)',
                  }}
                >
                  {AUTO_REFRESH_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => { setAutoRefresh(option.value); setShowAutoRefreshMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:opacity-80 flex items-center justify-between"
                      style={{
                        backgroundColor: autoRefresh === option.value ? 'var(--accent-primary)' : 'transparent',
                        color: autoRefresh === option.value ? 'var(--accent-text)' : 'var(--theme-content-text)',
                      }}
                    >
                      {option.label}
                      {autoRefresh === option.value && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Columns dropdown */}
          <div className="relative" ref={columnsDropdownRef}>
            <button 
              onClick={() => setShowColumns(!showColumns)}
              className="btn-icon"
              title="Управление столбцами"
            >
              <Columns className="w-4 h-4" />
            </button>

            {showColumns && (
              <div 
                className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg shadow-xl overflow-hidden"
                style={{
                  backgroundColor: 'var(--theme-card-bg)',
                  border: '1px solid var(--theme-card-border)',
                }}
              >
                <div 
                  className="px-3 py-2 font-medium text-sm"
                  style={{ 
                    borderBottom: '1px solid var(--theme-card-border)',
                    color: 'var(--theme-content-text)',
                  }}
                >
                  Столбцы
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {columns.map(col => (
                    <label 
                      key={col.key} 
                      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors"
                      style={{
                        color: 'var(--theme-content-text)',
                      }}
                      onMouseEnter={e => {
                        (e.target as HTMLElement).style.backgroundColor = 'var(--theme-sidebar-item-hover-bg)';
                      }}
                      onMouseLeave={e => {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumn(col.key)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--theme-primary-color)' }}
                      />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table container with scroll */}
      <div 
        ref={tableRef}
        className="overflow-auto"
        style={{ 
          height,
          backgroundColor: 'var(--theme-table-bg)',
        }}
      >
        <table className="w-full" style={{ minWidth: 'max-content' }}>
          <thead 
            className="sticky top-0 z-10"
            style={{ backgroundColor: 'var(--theme-table-header-bg)' }}
          >
            {/* Column headers */}
            <tr>
              {visibleColumns.map(col => {
                const isSorted = sortField === col.key;
                const canSort = col.sortable !== false && onSort;
                
                return (
                  <th
                    key={col.key}
                    data-column-key={col.key}
                    draggable
                    onDragStart={e => handleDragStart(e, col.key)}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, col.key)}
                    className="text-left text-xs font-semibold uppercase tracking-wider select-none relative group"
                    style={{
                      width: col.width,
                      minWidth: col.width,
                      maxWidth: col.width,
                      padding: '0.75rem 1rem',
                      color: 'var(--theme-table-header-text)',
                      borderBottom: '1px solid var(--theme-table-border)',
                      cursor: canSort ? 'pointer' : 'grab',
                      backgroundColor: isSorted ? 'var(--theme-primary-color)' : undefined,
                    }}
                    onClick={() => handleSortClick(col)}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical 
                        className="w-3 h-3 opacity-30 group-hover:opacity-70 flex-shrink-0" 
                        onMouseDown={e => e.stopPropagation()}
                      />
                      <span className="flex-grow">{col.label}</span>
                      
                      {/* Sort indicator */}
                      {canSort && (
                        <span className="flex-shrink-0 ml-1">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5" style={{ color: isSorted ? 'white' : 'var(--theme-content-text-muted)' }} />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5" style={{ color: isSorted ? 'white' : 'var(--theme-content-text-muted)' }} />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70" />
                          )}
                        </span>
                      )}
                    </div>
                    
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-cyan-500/50"
                      onMouseDown={e => {
                        e.stopPropagation();
                        handleResizeStart(e, col.key, col.width || DEFAULT_COLUMN_WIDTH);
                      }}
                      style={{
                        backgroundColor: resizingColumn === col.key ? 'var(--theme-primary-color)' : 'transparent',
                      }}
                    />
                  </th>
                );
              })}
            </tr>
            
            {/* Column filters */}
            <tr style={{ backgroundColor: 'var(--theme-card-bg)' }}>
              {visibleColumns.map(col => (
                <th
                  key={`filter-${col.key}`}
                  data-column-key={col.key}
                  className="p-1"
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    maxWidth: col.width,
                    borderBottom: '1px solid var(--theme-table-border)',
                  }}
                >
                  <div className="relative">
                    <Search 
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" 
                      style={{ color: 'var(--theme-content-text-muted)' }}
                    />
                    <input
                      type="text"
                      placeholder="Фильтр..."
                      value={columnFilters[col.key] || ''}
                      onChange={e => setColumnFilters(prev => ({
                        ...prev,
                        [col.key]: e.target.value
                      }))}
                      className="w-full text-xs py-1 pl-7 pr-2 rounded"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        border: '1px solid var(--theme-input-border)',
                        color: 'var(--theme-input-text)',
                      }}
                    />
                    {columnFilters[col.key] && (
                      <button
                        onClick={() => setColumnFilters(prev => ({ ...prev, [col.key]: '' }))}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-500/30"
                      >
                        <X className="w-3 h-3" style={{ color: 'var(--theme-content-text-muted)' }} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {loading && isFirstLoad.current ? (
              <tr>
                <td 
                  colSpan={visibleColumns.length} 
                  className="text-center p-8"
                  style={{ color: 'var(--theme-content-text-muted)' }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Загрузка...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td 
                  colSpan={visibleColumns.length} 
                  className="text-center p-8"
                  style={{ color: 'var(--theme-content-text-muted)' }}
                >
                  <div className="empty-state">
                    <Filter className="w-8 h-8 mb-2 opacity-50" />
                    {loading ? 'Загрузка...' : 'Нет данных'}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={`${onRowClick ? 'cursor-pointer' : ''}`}
                  style={{
                    borderBottom: '1px solid var(--theme-table-border)',
                    backgroundColor: idx % 2 === 1 ? 'var(--theme-table-row-alt-bg)' : 'transparent',
                  }}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-table-row-hover-bg)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = idx % 2 === 1 ? 'var(--theme-table-row-alt-bg)' : 'transparent';
                  }}
                >
                  {visibleColumns.map(col => (
                    <td 
                      key={col.key}
                      data-column-key={col.key}
                      className="px-4 py-2 text-sm"
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                        color: 'var(--theme-table-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCellValue(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with pagination */}
      <div 
        className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between text-sm"
        style={{ 
          borderTop: '1px solid var(--theme-card-border)',
          backgroundColor: 'var(--theme-card-bg)',
        }}
      >
        <div className="flex gap-4 items-center">
          <div style={{ color: 'var(--theme-content-text-muted)' }}>
            Всего: <strong style={{ color: 'var(--theme-content-text)' }}>{total}</strong>
            {' '} | Показано: <strong style={{ color: 'var(--theme-content-text)' }}>{data.length}</strong>
          </div>
          
          <div className="flex gap-2 items-center">
            <span style={{ color: 'var(--theme-content-text-muted)' }}>
              Показывать:
            </span>
            <select
              className="input py-1 px-2 w-20 text-sm"
              value={limit}
              onChange={e => changeLimit(Number(e.target.value))}
            >
              {LIMITS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-1 items-center">
          <button
            className="btn-icon"
            disabled={currentPage <= 1}
            onClick={() => goToPage(1)}
            title="Первая страница"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            className="btn-icon"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            title="Предыдущая страница"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex gap-1 px-2">
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className="w-8 h-8 rounded text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: currentPage === pageNum ? 'var(--theme-primary-color)' : 'transparent',
                    color: currentPage === pageNum ? 'white' : 'var(--theme-content-text-muted)',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            className="btn-icon"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
            title="Следующая страница"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            className="btn-icon"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(totalPages)}
            title="Последняя страница"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
