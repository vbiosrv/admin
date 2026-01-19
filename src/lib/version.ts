import { shm_request } from './shm_request';

export interface VersionInfo {
  backend: {
    version: string;
    commitSha: string;
    releaseUrl: string;
  };
  frontend: {
    version: string;
    commitSha: string;
    releaseUrl: string;
  };
}

export async function getVersion(): Promise<VersionInfo> {
  let frontend = {
    version: '',
    commitSha: '',
    releaseUrl: '',
  };

  let backend = {
    version: '',
    commitSha: '',
    releaseUrl: '',
  };

  // Fetch frontend version
  try {
    const response = await fetch('version.json');
    if (response.ok) {
      frontend = await response.json();
    }
  } catch (error) {
    // Frontend version fetch failed, use default
  }

  // Fetch backend version
  try {
    backend = await shm_request('shm/v1/admin/system/version');
  } catch (error) {
    // Backend version fetch failed, use default
  }

  return {
    backend,
    frontend,
  };
}

// Export for debugging in console
if (typeof window !== 'undefined') {
  (window as any).getVersion = getVersion;
}
