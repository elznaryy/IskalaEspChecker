import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// Cache for DNS results to prevent redundant lookups
const dnsCache = new Map<string, {
  result: DomainResult;
  timestamp: number;
}>();

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const BATCH_SIZE = 50; // Process domains in batches

interface DomainResult {
  domain: string;
  provider: string;
  mxRecords: string[];
}

const checkEmailProvider = async (domain: string): Promise<DomainResult> => {
  // Check cache first
  const cached = dnsCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }

  try {
    const mxRecords = await resolveMx(domain);
    const mxHosts = mxRecords.map(record => record.exchange.toLowerCase());

    let provider = 'Unknown';
    
    if (mxHosts.some(host => 
      host.includes('google.com') || 
      host.includes('googlemail.com')
    )) {
      provider = 'Google';
    } else if (mxHosts.some(host => 
      host.includes('outlook.com') || 
      host.includes('office365.com') || 
      host.includes('microsoft.com') ||
      host.includes('hotmail.com')
    )) {
      provider = 'Outlook';
    } else {
      provider = 'Others';
    }

    const result = {
      domain,
      provider,
      mxRecords: mxHosts
    };

    // Cache the result
    dnsCache.set(domain, {
      result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`DNS error for ${domain}: ${error.message}`);
    }
    return {
      domain,
      provider: 'Error',
      mxRecords: []
    };
  }
};

const normalizeDomain = (domain: string): string => {
  return domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .toLowerCase()
    .trim();
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const providersJson = formData.get('providers') as string | null
    const domainColumn = parseInt(formData.get('domainColumn') as string)
    const resultColumn = parseInt(formData.get('resultColumn') as string)

    // Validate input
    if (!file || !providersJson || isNaN(domainColumn) || isNaN(resultColumn)) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid parameters' },
        { status: 400 }
      )
    }

    const selectedProviders = JSON.parse(providersJson)
    const bytes = await file.arrayBuffer()
    const csvContent = Buffer.from(bytes).toString('utf-8')
    const lines = csvContent.split('\n').filter(line => line.trim())

    // Process CSV
    const results = []
    const headerRow = lines[0]
    results.push(headerRow) // Preserve header row

    for (let i = 1; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, Math.min(i + BATCH_SIZE, lines.length))
      const batchResults = await Promise.all(
        batch.map(async (line) => {
          const columns = line.split(',')
          const domain = columns[domainColumn]?.trim()

          if (!domain?.includes('.')) return line

          try {
            const normalizedDomain = normalizeDomain(domain)
            const domainResult = await checkEmailProvider(normalizedDomain)
            
            if (
              selectedProviders.includes('All') ||
              selectedProviders.includes(domainResult.provider) ||
              (selectedProviders.includes('GoogleAndOthers') && 
                (domainResult.provider === 'Google' || domainResult.provider === 'Others')) ||
              (selectedProviders.includes('OthersOnly') && domainResult.provider === 'Others')
            ) {
              columns[resultColumn] = domainResult.provider
            }

            return columns.join(',')
          } catch (error) {
            console.error(`Error processing ${domain}:`, error)
            return line
          }
        })
      )
      results.push(...batchResults)
    }

    const finalCsv = results.join('\n')

    return NextResponse.json({
      success: true,
      fileUrl: `data:text/csv;base64,${Buffer.from(finalCsv).toString('base64')}`
    })

  } catch (error) {
    console.error('Processing error:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
