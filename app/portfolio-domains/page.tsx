'use client';

import React, { useState, useEffect } from 'react';
import { DomainCard } from '@/components/portfolioDomains/DomainCard';

interface PortfolioDomain {
  id: string;
  name: string;
  description: { markdown: string };
}

export default function PortfolioDomainsPage() {
  const [domains, setDomains] = useState<PortfolioDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 PortfolioDomainsPage component mounted');
    
    const fetchDomains = async () => {
      try {
        const url = 'http://localhost:5000/api/portfolio-domains';
        console.log('=== CLIENT-SIDE DEBUG ===');
        console.log('Fetching from:', url);
        
        const res = await fetch(url, { 
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('Response status:', res.status);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('API Error:', res.status, errorText);
          throw new Error(`Failed to fetch domains: ${res.status} ${errorText}`);
        }
        
        const data = await res.json();
        console.log('✅ Response data:', data);
        setDomains(data);
      } catch (err: any) {
        console.error('❌ fetchDomains error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDomains();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading portfolio domains...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">❌ Error Loading Portfolio Domains</h2>
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-gray-600 mt-2">
            💡 Check the browser console for more details.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Portfolio Management Domains</h1>
        <p className="text-gray-600 mt-2">
          Explore the key domains that define our portfolio management approach.
        </p>
      </div>
      
      <div className="grid gap-6">
        {domains.map(domain => (
          <DomainCard key={domain.id} name={domain.name} description={domain.description.markdown} />
        ))}
      </div>
      
      {domains.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No portfolio domains found.</p>
        </div>
      )}
    </div>
  );
}
