import React from 'react';
import { DomainCard } from './DomainCard';

interface PortfolioDomain {
  id: string;
  name: string;
  description: { markdown: string };
}

export function DomainList({ domains }: { domains: PortfolioDomain[] }) {
  return (
    <div className="grid gap-6">
      {domains.map(domain => (
        <DomainCard key={domain.id} name={domain.name} description={domain.description.markdown} />
      ))}
    </div>
  );
}
