import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const filePath = join(process.cwd(), 'uploads', ...params.path);

  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileStream = createReadStream(filePath);
  const readableStream = Readable.toWeb(fileStream) as ReadableStream;

  return new NextResponse(readableStream, {
    headers: {
      'Content-Disposition': `attachment; filename="${params.path[params.path.length - 1]}"`,
      'Content-Type': 'text/csv',
    },
  });
}
