const BACKEND_URL = 'http://localhost:8000';

export interface ScanResponse {
  success: boolean;
  context: string;
  message: string;
}

export const scanGitRepo = async (url: string): Promise<ScanResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/scan-repo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to scan repository');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Git Scan Error:', error);
    throw new Error(error.message || 'Failed to connect to backend server. Make sure main.py is running.');
  }
};

export const scanLocalPath = async (path: string): Promise<ScanResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/scan-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to scan local path');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Local Scan Error:', error);
    throw new Error(error.message || 'Failed to connect to backend server. Make sure main.py is running.');
  }
};
