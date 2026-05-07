import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';

export async function POST(req: Request) {
  try {
    const { fileName, contentType, fileSize, jobId } = await req.json();

    const drive = await getDriveClient();

    // 1. Initial request to get the resumable session URL
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
        appProperties: {
          jobId: jobId || 'unassigned',
        }
      },
      media: {
        mimeType: contentType,
      },
      fields: 'id',
    }, {
      // This is the trick for resumable uploads in the Node SDK
      onUploadProgress: (evt) => {}, // Just to trigger resumable logic in some versions
    });

    // Wait, the Node SDK doesn't easily expose the session URL for the frontend.
    // It's better to manually perform the first POST to get the Location header
    // but use the SDK for the auth token.

    const auth = (drive.context._options.auth as any);
    const { token } = await auth.getAccessToken();

    if (!token) {
      throw new Error('Failed to retrieve access token');
    }

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': fileSize.toString(),
      },
      body: JSON.stringify({
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
        properties: {
          jobId: jobId || 'unassigned',
        }
      }),
    });

    const location = res.headers.get('Location');

    if (!location) {
      const errorText = await res.text();
      console.error('Drive API Error:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json({ 
          error: 'Drive API Error', 
          details: errorJson.error?.message || errorText 
        }, { status: res.status });
      } catch {
        return NextResponse.json({ error: 'Failed to initiate resumable upload', details: errorText }, { status: res.status });
      }
    }

    return NextResponse.json({ uploadUrl: location });

  } catch (error: any) {
    console.error('Upload initiation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
