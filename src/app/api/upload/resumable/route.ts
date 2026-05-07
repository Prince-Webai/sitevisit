import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin') || '';
    const { fileName, contentType, fileSize, jobId, subfolderName } = await req.json();

    const drive = await getDriveClient();
    const auth = (drive.context._options.auth as any);
    const { token } = await auth.getAccessToken();

    if (!token) {
      throw new Error('Failed to retrieve access token - Check your GOOGLE_REFRESH_TOKEN');
    }

    const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;
    let targetFolderId = PARENT_FOLDER_ID;

    // 1. Handle Subfolder Creation if requested
    if (subfolderName) {
      const folderName = subfolderName.trim() || 'unnamed-visit';
      
      // Search for existing folder with this name
      const listRes = await drive.files.list({
        q: `name = '${folderName.replace(/'/g, "\\'")}' and '${PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (listRes.data.files && listRes.data.files.length > 0) {
        targetFolderId = listRes.data.files[0].id!;
      } else {
        // Create new folder
        const createRes = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [PARENT_FOLDER_ID],
          },
          fields: 'id',
        });
        targetFolderId = createRes.data.id!;
      }
    }

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': fileSize.toString(),
        ...(origin && { 'Origin': origin }),
      },
      body: JSON.stringify({
        name: fileName,
        parents: [targetFolderId],
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
