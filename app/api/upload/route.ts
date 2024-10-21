import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import csv from 'csv-parser';
import { nanoid } from 'nanoid';
import dns from 'dns';
import { promisify } from 'util';
import { mkdir, writeFile } from 'fs/promises';  // Use fs/promises for async file operations

const resolveMx = promisify(dns.resolveMx);

const checkEmailProvider = async (domain: string): Promise<string> => {
  try {
    const mxRecords = await resolveMx(domain);
    const mxHost = mxRecords[0]?.exchange.toLowerCase();

    if (mxHost?.includes('google') || mxHost?.includes('googlemail')) {
      return 'G Suite';
    } else if (mxHost?.includes('outlook') || mxHost?.includes('hotmail')) {
      return 'Outlook';
    } else {
      return 'Other';
    }
  } catch (error) {
    console.error(`Error resolving MX records for ${domain}:`, error);
    return 'Error';
  }
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const providersJson = formData.get('providers') as string | null;

    if (!file || !providersJson) {
      return NextResponse.json({ success: false, message: 'No file uploaded or providers selected' }, { status: 400 });
    }

    const selectedProviders = JSON.parse(providersJson);

    const uploadsDir = join(process.cwd(), 'uploads');

    // Use mkdir from fs/promises with the recursive option
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${nanoid()}.csv`;
    const filepath = join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filepath, buffer);

    const domains: string[] = [];
    const results: { Domain: string; 'ESP Provider': string }[] = [];

    interface CsvRow {
      [key: string]: string;
    }

    await new Promise((resolve, reject) => {
      createReadStream(filepath)
        .pipe(csv())
        .on('data', (row: CsvRow) => {
          const firstColumnValue = Object.values(row)[0];
          if (firstColumnValue && typeof firstColumnValue === 'string') {
            domains.push(firstColumnValue.trim());
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (domains.length === 0) {
      return NextResponse.json({ success: false, message: 'No valid domains found in the CSV file' }, { status: 400 });
    }

    for (const domain of domains) {
      const provider = await checkEmailProvider(domain);
      results.push({ Domain: domain, 'ESP Provider': provider });
    }

    let filteredResults = results;

    if (!selectedProviders.includes('All')) {
      filteredResults = results.filter(result => {
        const provider = result['ESP Provider'];
        if (selectedProviders.includes('Google') && provider === 'G Suite') return true;
        if (selectedProviders.includes('Outlook') && provider === 'Outlook') return true;
        if (selectedProviders.includes('GoogleAndOthers') && (provider === 'G Suite' || provider === 'Other')) return true;
        if (selectedProviders.includes('OthersOnly') && provider === 'Other') return true;
        return false;
      });
    }

    const outputFilename = `processed_${filename}`;
    const outputFilepath = join(uploadsDir, outputFilename);
    const csvHeader = 'Domain,ESP Provider\n';
    const csvContent = filteredResults.map((row) => `${row.Domain},${row['ESP Provider']}`).join('\n');

    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(outputFilepath);
      writeStream.write(csvHeader + csvContent, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    return NextResponse.json({ success: true, fileUrl: `/uploads/${outputFilename}` });
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
