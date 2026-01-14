import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Key, User, Plus, Trash2 } from 'lucide-react';
import JsonEditor from '../components/JsonEditor';
import ConfirmModal from '../components/ConfirmModal';
import PayCreateModal from '../modals/PayCreateModal';
import BonusCreateModal from '../modals/BonusCreateModal';
import UserChangePasswordModal from '../modals/UserChangePasswordModal';
import { shm_request } from '../lib/shm_request';
import { createApiUrl } from '../lib/basePath';

export default function UserEdit() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  // Обновляем данные при фокусе на странице
  useEffect(() => {
    const handleFocus = () => {
      if (userId) {
        fetchUser();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await shm_request(`shm/v1/admin/user?user_id=${userId}`);
      if (response.data && response.data[0]) {
        setFormData(response.data[0]);
      } else {
        toast.error('Пользователь не найден');
        navigate('/users');
      }
    } catch (error) {
      toast.error('Ошибка загрузки данных пользователя');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.login?.trim()) {
      toast.error('Введите логин');
      return;
    }

    setSaving(true);
    try {
      await shm_request('shm/v1/admin/user', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      toast.success('Пользователь успешно сохранен');
      await fetchUser(); // Обновляем данные
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setConfirmDelete(false);
    try {
      await shm_request(`shm/v1/admin/user?user_id=${formData.user_id}`, {
        method: 'DELETE',
      });
      toast.success('Пользователь удален');
      navigate('/users');
    } catch (error) {
      toast.error('Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleChangePassword = async (userId: number, password: string) => {
    await shm_request('shm/v1/admin/user/passwd', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, password }),
    });
    toast.success('Пароль изменен');
  };

  const handleCliLogin = async () => {
    if (!formData?.user_id) {
      toast.error('Не удалось получить user_id');
      return;
    }

    try {
      const configRes = await shm_request('shm/v1/admin/config/cli');
      if (!configRes.data || configRes.data.length === 0) {
        toast.error('Не удалось получить URL');
        return;
      }

      const cliUrl = configRes.data[0].url;
      const sessionRes = await shm_request('shm/v1/admin/user/session', {
        method: 'PUT',
        body: JSON.stringify({ user_id: formData.user_id }),
      });
      const sessionId = sessionRes.id;
      window.open(`${cliUrl}${createApiUrl('shm/user/auth.cgi')}?session_id=${sessionId}`, '_blank');
    } catch (error) {
      toast.error('Не удалось открыть ссылку');
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

  const cardStyles = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-content-text)',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/users')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Назад к списку пользователей"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-content-text)' }}>
          Редактирование пользователя с UID: {formData.user_id}
        </h1>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Основная информация */}
        <div className="rounded-lg border p-6" style={cardStyles}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
            Основная информация
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                ID
              </label>
              <input
                type="text"
                value={formData.user_id || ''}
                disabled
                className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Полное имя
              </label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Логин <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.login || ''}
                onChange={(e) => handleChange('login', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Telegram Логин
              </label>
              <input
                type="text"
                value={formData.settings?.telegram?.username || formData.settings?.telegram?.login || ''}
                onChange={(e) => handleChange('settings', {
                  ...formData.settings,
                  telegram: {
                    ...formData.settings?.telegram,
                    username: e.target.value
                  }
                })}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
          </div>
        </div>

        {/* Контактная информация */}
        <div className="rounded-lg border p-6" style={cardStyles}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
            Контактная информация
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Телефон
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                ID агента
              </label>
              <input
                type="number"
                value={formData.partner_id || ''}
                onChange={(e) => handleChange('partner_id', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
          </div>
        </div>

        {/* Даты */}
        <div className="rounded-lg border p-6" style={cardStyles}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
            Информация о датах
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Дата создания
              </label>
              <input
                type="text"
                disabled
                value={formData.created || ''}
                className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Последний вход
              </label>
              <input
                type="text"
                disabled
                value={formData.last_login || ''}
                className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
                style={inputStyles}
              />
            </div>
          </div>
        </div>

        {/* Баланс и бонусы */}
        <div className="rounded-lg border p-6" style={cardStyles}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
            Баланс и бонусы
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Баланс
              </label>
              <input
                type="text"
                value={formData.balance ?? ''}
                disabled
                className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
                style={inputStyles}
              />
              <button
                onClick={() => setPayModalOpen(true)}
                className="p-2 rounded hover:opacity-80 transition-opacity shrink-0 btn-success"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-text)',
                }}
                title="Начислить платеж"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Бонусы
              </label>
              <input
                type="text"
                value={formData.bonus ?? ''}
                disabled
                className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
                style={inputStyles}
              />
              <button
                onClick={() => setBonusModalOpen(true)}
                className="p-2 rounded hover:opacity-80 transition-opacity shrink-0 btn-success"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-text)',
                }}
                title="Начислить бонус"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Кредит и скидки */}
        <div className="rounded-lg border p-6" style={cardStyles}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
            Кредит и скидки
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Кредит
              </label>
              <input
                type="number"
                value={formData.credit ?? ''}
                onChange={(e) => handleChange('credit', e.target.value ? Number(e.target.value) : null)}
                disabled={!!formData.can_overdraft}
                className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
                style={inputStyles}
              />
              <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.can_overdraft}
                  onChange={(e) => handleChange('can_overdraft', e.target.checked ? 1 : 0)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs whitespace-nowrap" style={labelStyles}>Безлимит</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Скидка %
              </label>
              <input
                type="number"
                value={formData.discount ?? ''}
                onChange={(e) => handleChange('discount', e.target.value ? Number(e.target.value) : null)}
                min={0}
                max={100}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
          </div>
        </div>

        {/* Статус */}
        {formData.user_id !== 1 && (
          <div className="rounded-lg border p-6" style={cardStyles}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
              Статус пользователя
            </h3>
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
                Заблокирован
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.block}
                  onChange={(e) => handleChange('block', e.target.checked ? 1 : 0)}
                  className="w-4 h-4 rounded"
                />
                {formData.block ? (
                  <span className="text-red-500 text-sm font-medium">Да</span>
                ) : (
                  <span className="text-green-500 text-sm font-medium">Нет</span>
                )}
              </label>
            </div>
          </div>
        )}

        {/* Настройки */}
        <div className="rounded-lg border p-6" style={cardStyles}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
            Дополнительные настройки (JSON)
          </h3>
          <JsonEditor
            data={formData.settings ?? {}}
            onChange={(newData) => handleChange('settings', newData)}
            showInput={true}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row justify-between w-full gap-2 mt-6">
        <div>
          {formData.user_id !== 1 && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              title="Удалить"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{deleting ? 'Удаление...' : 'Удалить'}</span>
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={handleCliLogin}
            className="p-2 rounded flex items-center gap-2"
            style={{
              backgroundColor: 'var(--theme-button-secondary-bg)',
              color: 'var(--theme-button-secondary-text)',
              border: '1px solid var(--theme-button-secondary-border)',
            }}
            title="В кабинет"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">В кабинет</span>
          </button>

          <button
            onClick={() => setChangePasswordModalOpen(true)}
            className="p-2 rounded flex items-center gap-2"
            style={{
              backgroundColor: 'var(--theme-button-secondary-bg)',
              color: 'var(--theme-button-secondary-text)',
              border: '1px solid var(--theme-button-secondary-border)',
            }}
            title="Сменить пароль"
          >
            <Key className="w-4 h-4" />
            <span className="hidden sm:inline">Сменить пароль</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2 rounded flex items-center gap-2 btn-success"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-text)',
            }}
            title="Сохранить"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">{saving ? 'Сохранение...' : 'Сохранить'}</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление пользователя"
        message={`Вы уверены, что хотите удалить пользователя "${formData.login}"? Это действие необратимо.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
        confirmWord="delete"
        confirmWordHint="Введите «delete» для подтверждения удаления:"
      />

      <PayCreateModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onSave={async (payData) => {
          const dataWithUser = { ...payData, user_id: formData.user_id };
          await shm_request('shm/v1/admin/user/payment', {
            method: 'PUT',
            body: JSON.stringify(dataWithUser),
          });
          await fetchUser();
          setPayModalOpen(false);
        }}
      />

      <BonusCreateModal
        open={bonusModalOpen}
        onClose={() => setBonusModalOpen(false)}
        onSave={async (bonusData) => {
          const dataWithUser = { ...bonusData, user_id: formData.user_id };
          await shm_request('shm/v1/admin/user/bonus', {
            method: 'PUT',
            body: JSON.stringify(dataWithUser),
          });
          await fetchUser();
          setBonusModalOpen(false);
        }}
      />

      <UserChangePasswordModal
        open={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        userId={formData.user_id}
        userLogin={formData.login}
        onSave={handleChangePassword}
      />
    </div>
  );
}