import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { createReadStream } from 'fs';
import { access } from 'fs/promises'; // Changed from 'stat' to 'access'
import { Readable } from 'stream';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const filePath = join(process.cwd(), 'uploads', ...params.path);

  try {
    // Use access to check if the file exists
    await access(filePath); // Faster check for file existence
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileStream = createReadStream(filePath);
  
  // Check if the file stream was created successfully
  if (!fileStream) {
    return NextResponse.json({ error: 'Unable to read file' }, { status: 500 });
  }

  const readableStream = Readable.toWeb(fileStream) as ReadableStream;

  return new NextResponse(readableStream, {
    headers: {
      'Content-Disposition': `attachment; filename="${params.path[params.path.length - 1]}"`,
      'Content-Type': 'text/csv', // Consider dynamic content type if needed
    },
  });
}
