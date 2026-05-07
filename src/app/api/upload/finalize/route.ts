import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';

export async function POST(req: Request) {
  try {
    const { fileId, fileType } = await req.json();
    const drive = await getDriveClient();

    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const isVideo = (fileType as string)?.startsWith('video/');
    const url = isVideo
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;

    return NextResponse.json({ url, fileId });
  } catch (error: any) {
    console.error('Finalize upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
