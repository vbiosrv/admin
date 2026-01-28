import { useEffect, useState } from 'react';
import { getVersion, VersionInfo } from '../lib/version';
import { showGlobalToast } from './Toast';
import {
  GithubIcon,
  Copy,
  X,
  Send,
  Heart,
} from 'lucide-react';

export function VersionBadge() {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  const handleCopy = (value: any) => {
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    navigator.clipboard.writeText(text);
    showGlobalToast('Скопировано', 'success');
  };

  if (!version) return null;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
          title="Информация о версии"
        >
          v:{version.frontend.version}
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-6 min-w-[400px] max-w-[90vw] max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">
                    Информация о версии
                    <button
                        onClick={() => handleCopy(version)}
                        className="self-end px-3 rounded items-center gap-2 text-sm"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 mb-2">
                          Backend version: {version.backend.version || 'N/A'}
                          <button
                              onClick={() => handleCopy(version.backend)}
                              className="self-end px-3 rounded items-center gap-2 text-sm"
                          >
                              <Copy className="w-3 h-3" />
                          </button>
                      </div>
                      <div className="font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded break-all">
                        <GithubIcon className="inline-block mr-1 mb-0.5 w-4 h-4 text-gray-400" />
                          <a
                            href={version.backend.releaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {version.backend.commitSha || 'N/A'}
                          </a>
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 mb-2">
                          Frontend version: {version.frontend.version || 'N/A'}
                          <button
                              onClick={() => handleCopy(version.frontend)}
                              className="self-end px-3 rounded items-center gap-2 text-sm"
                          >
                              <Copy className="w-3 h-3" />
                          </button>
                      </div>
                      <div className="font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded break-all">
                        <GithubIcon className="inline-block mr-1 mb-0.5 w-4 h-4 text-gray-400" />
                          <a
                            href={version.frontend.releaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {version.frontend.commitSha || 'N/A'}
                          </a>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-center gap-4">
                    <a
                      href="https://docs.vbios.ru/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 text-sm transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                      Спонсорство
                    </a>
                    <a
                      href="https://t.me/+YvNidsv9cwQ2MGYy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Сообщество
                    </a>
                    <a
                      href="https://github.com/vbiosrv/shm"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg flex items-center gap-2 text-sm transition-colors"
                    >
                      <GithubIcon className="w-4 h-4" />
                      GitHub
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
