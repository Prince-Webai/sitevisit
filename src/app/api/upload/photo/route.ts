import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';
import { Readable } from 'stream';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const jobId = formData.get('jobId') as string | null;
    const subfolderName = formData.get('subfolderName') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const drive = await getDriveClient();
    const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;
    let targetFolderId = PARENT_FOLDER_ID;

    // Find or create subfolder named after the client phone number
    if (subfolderName?.trim()) {
      const folderName = subfolderName.trim();
      const listRes = await drive.files.list({
        q: `name = '${folderName.replace(/'/g, "\\'")}' and '${PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
        spaces: 'drive',
      });

      if (listRes.data.files?.length) {
        targetFolderId = listRes.data.files[0].id!;
      } else {
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

    // Upload image directly via Drive API (server-side, no CORS)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const stream = Readable.from(buffer);

    const uploadRes = await drive.files.create({
      requestBody: {
        name: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        parents: [targetFolderId],
        properties: { jobId: jobId || 'unassigned' },
      },
      media: {
        mimeType: file.type || 'image/jpeg',
        body: stream,
      },
      fields: 'id',
    });

    const fileId = uploadRes.data.id!;

    // Make the file publicly readable
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    return NextResponse.json({ url, fileId });
  } catch (error: any) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
