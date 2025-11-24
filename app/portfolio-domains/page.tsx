import React from 'react';
import { DomainList } from '@/components/portfolioDomains/DomainList';

interface PortfolioDomain {
  id: string;
  name: string;
  description: { markdown: string };
}

async function fetchDomains(): Promise<PortfolioDomain[]> {
  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL || ''}/portfolio-domains`;
    console.log('Fetching from:', url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error:', res.status, errorText);
      throw new Error(`Failed to fetch domains: ${res.status} ${errorText}`);
    }
    return res.json();
  } catch (err) {
    console.error('fetchDomains error:', err);
    throw err;
  }
}

export default async function PortfolioDomainsPage() {
  const domains = await fetchDomains();
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Portfolio Management Domains</h1>
      <DomainList domains={domains} />
    </div>
  );
}
