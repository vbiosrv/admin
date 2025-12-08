import React, { useState, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import { Save, X, Trash2, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import JsonEditor from '../components/JsonEditor';
import ConfirmModal from '../components/ConfirmModal';
import TemplateTestModal from './TemplateTestModal';
import { shm_request } from '../lib/shm_request';
import { useThemeStore } from '../store/themeStore';

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

export default function TemplateModal({
  open,
  onClose,
  data,
  onSave,
  onDelete,
}: TemplateModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState('plaintext');
  const editorRef = useRef<any>(null);
  const { resolvedTheme } = useThemeStore();
  const [testModalOpen, setTestModalOpen] = useState(false);

  // Загрузка данных шаблона с сервера
  useEffect(() => {
    if (open && data?.id) {
      setLoading(true);
      shm_request(`/shm/v1/admin/template?id=${data.id}`)
        .then(res => {
          const templateData = res.data?.[0] || res.data;
          setFormData({ ...templateData, is_add: 0 });
          detectLanguage(templateData.data || '');
        })
        .catch(err => {
          console.error('Ошибка загрузки шаблона:', err);
          toast.error('Ошибка загрузки шаблона');
          setFormData({ ...data, is_add: 0 });
        })
        .finally(() => setLoading(false));
    } else if (open && !data?.id) {
      setFormData({ is_add: 1, data: '', settings: {} });
      setEditorLanguage('plaintext');
    }
  }, [data, open]);

  const detectLanguage = (content: string) => {
    if (!content) {
      setEditorLanguage('plaintext');
      return;
    }

    const trimmed = content.trim();
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      setEditorLanguage('json');
    } else if (
      content.includes('#!/bin/bash') ||
      content.includes('#!/bin/sh') ||
      content.includes('set -e') ||
      content.includes('echo ') ||
      (content.includes('if [') && content.includes('then'))
    ) {
      setEditorLanguage('shell');
    } else if (
      content.includes('#!/usr/bin/perl') ||
      content.includes('use strict;') ||
      content.includes('my $')
    ) {
      setEditorLanguage('perl');
    } else if (
      content.includes('[%') || content.includes('%]') ||
      content.includes('<%') || content.includes('%>') ||
      content.includes('{{') || content.includes('}}')
    ) {
      setEditorLanguage('html'); // Template Toolkit как HTML
    } else if (
      content.includes('<html') || content.includes('<!DOCTYPE') ||
      content.includes('<head>') || content.includes('<body>')
    ) {
      setEditorLanguage('html');
    } else {
      setEditorLanguage('plaintext');
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditorChange = (value: string | undefined) => {
    handleChange('data', value || '');
  };
  const handleSave = async () => {
    if (!formData.id) {
      toast.error('Введите ID шаблона');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      toast.success('Шаблон сохранён');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndTest = async () => {
    if (!formData.id) {
      toast.error('Введите ID шаблона');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      toast.success('Шаблон сохранён');
      setTestModalOpen(true);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !formData.id) return;

    setDeleting(true);
    try {
      await onDelete(formData.id);
      setConfirmDeleteOpen(false);
      onClose();
      toast.success('Шаблон удалён');
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

  const isAdd = formData.is_add === 1;

  const renderFooter = () => (
    <div className="flex justify-between items-center w-full">
      <div>
        {!isAdd && onDelete && (
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
      <div className="flex gap-2">
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
          Отмена
        </button>
        <button
          onClick={handleSaveAndTest}
          disabled={saving || !formData.id || isAdd}
          className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-primary"
          style={{
            backgroundColor: 'var(--theme-button-info-bg)',
            color: 'var(--theme-button-info-text)',
            border: '1px solid var(--theme-button-info-border)',
          }}
        >
          <Play className="w-4 h-4" />
          Save & Render
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !formData.id}
          className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isAdd ? 'Создание шаблона' : `Редактирование шаблона: ${formData.id || ''}`}
        footer={renderFooter()}
        size="xl"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ID шаблона */}
            <div className="flex items-center gap-3">
              <label className="w-24 text-sm font-medium shrink-0" style={labelStyles}>
                ID *
              </label>
              <input
                type="text"
                value={formData.id || ''}
                onChange={(e) => handleChange('id', e.target.value)}
                readOnly={!isAdd}
                pattern="[A-Za-z0-9_\-\/]+"
                placeholder="template-id"
                className={`flex-1 px-3 py-2 text-sm rounded border ${!isAdd ? 'opacity-60' : ''}`}
                style={inputStyles}
              />
            </div>

          {/* Переключатель языка */}
          <div className="flex items-center gap-2">
            <label className="w-24 text-sm font-medium shrink-0" style={labelStyles}>
              Язык
            </label>
            <div className="flex gap-1 flex-wrap">
              {['plaintext', 'json', 'html', 'shell', 'perl', 'javascript'].map(lang => (
                <button
                  key={lang}
                  onClick={() => setEditorLanguage(lang)}
                  className={`px-3 py-1 text-xs rounded ${
                    editorLanguage === lang ? 'font-semibold' : ''
                  }`}
                  style={{
                    backgroundColor: editorLanguage === lang ? 'var(--accent-primary)' : 'var(--theme-button-secondary-bg)',
                    color: editorLanguage === lang ? 'var(--accent-text)' : 'var(--theme-button-secondary-text)',
                    border: `1px solid ${editorLanguage === lang ? 'var(--accent-primary)' : 'var(--theme-button-secondary-border)'}`,
                  }}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() => detectLanguage(formData.data || '')}
                className="px-3 py-1 text-xs rounded"
                title="Автоопределение языка"
                style={{
                  backgroundColor: 'var(--theme-button-secondary-bg)',
                  color: 'var(--theme-button-secondary-text)',
                  border: '1px solid var(--theme-button-secondary-border)',
                }}
              >
                AUTO
              </button>
            </div>
          </div>

          {/* Monaco Editor для data */}
          <div className="flex items-start gap-3">
            <label className="w-24 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
              Данные
            </label>
            <div className="flex-1 border rounded overflow-hidden" style={{ borderColor: inputStyles.borderColor }}>
              <Editor
                height="400px"
                language={editorLanguage}
                value={formData.data || ''}
                onChange={handleEditorChange}
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
                options={{
                  fontSize: 14,
                  tabSize: 2,
                  insertSpaces: true,
                  wordWrap: 'on',
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: 'on',
                  folding: true,
                }}
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
              />
            </div>
          </div>

          {/* JsonEditor для settings */}
          <div className="flex items-start gap-3">
            <label className="w-24 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
              Settings
            </label>
            <div className="flex-1 border rounded" style={{ borderColor: inputStyles.borderColor }}>
              <JsonEditor
                data={formData.settings || {}}
                onChange={(value) => handleChange('settings', value)}
              />
            </div>
          </div>
        </div>
        )}
      </Modal>

      {/* Модалка подтверждения удаления */}
      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Удалить шаблон?"
        message={`Вы уверены, что хотите удалить шаблон "${formData.id}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
        confirmWord="delete"
        confirmWordHint='Введите "delete" для подтверждения'
      />

      {/* Модалка теста/рендера шаблона */}
      <TemplateTestModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        templateId={formData.id || ''}
      />
    </>
  );
}
