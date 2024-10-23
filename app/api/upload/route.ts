import { NextRequest, NextResponse } from 'next/server';
import csv from 'csv-parser';
import dns from 'dns';
import { promisify } from 'util';

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

const normalizeDomain = (domain: string): string => {
  // Remove protocol and www
  return domain.replace(/^(https?:\/\/)?(www\.)?/, '').trim();
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

    // Read the file into memory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const domains: string[] = [];
    const results: { Domain: string; 'ESP Provider': string }[] = [];

    // Process CSV content in memory
    const csvContent = buffer.toString('utf-8');
    const lines = csvContent.split('\n');

    for (const line of lines) {
      const domain = normalizeDomain(line);
      if (domain) {
        domains.push(domain);
      }
    }

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

    // Prepare CSV result in memory
    const csvHeader = 'Domain,ESP Provider\n';
    const csvResult = filteredResults.map(row => `${row.Domain},${row['ESP Provider']}`).join('\n');
    const finalCsv = csvHeader + csvResult;

    // Return the CSV as a base64 encoded string
    return NextResponse.json({ success: true, fileUrl: `data:text/csv;base64,${Buffer.from(finalCsv).toString('base64')}` });
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
