const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://xch4dunmjl.execute-api.us-east-1.amazonaws.com";

// Convert file to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 string
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// Upload single file
export async function uploadFile(file: File, folder = 'attachments'): Promise<{
  fileName: string;
  url: string;
  size: number;
  type: string;
}> {
  try {
    const fileData = await fileToBase64(file);
    
    const response = await fetch(`${API_BASE}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileData,
        fileName: file.name,
        fileType: file.type,
        folder
      })
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

// Upload multiple files
export async function uploadFiles(files: File[], folder = 'attachments'): Promise<Array<{
  fileName: string;
  url: string;
  size: number;
  type: string;
}>> {
  try {
    const fileDataArray = await Promise.all(
      files.map(async (file) => ({
        fileData: await fileToBase64(file),
        fileName: file.name,
        fileType: file.type
      }))
    );
    
    const response = await fetch(`${API_BASE}/api/files/upload-multiple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: fileDataArray,
        folder
      })
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Files upload error:', error);
    throw error;
  }
}

// Convert audio blob to file
export function audioBlobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}
