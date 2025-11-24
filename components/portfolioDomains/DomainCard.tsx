import React from 'react';

interface DomainCardProps {
  name: string;
  description: string;
}

export function DomainCard({ name, description }: DomainCardProps) {
  return (
    <div className="rounded-lg border p-4 bg-white shadow">
      <h2 className="text-xl font-semibold mb-2">{name}</h2>
      <div className="prose prose-sm text-gray-700" dangerouslySetInnerHTML={{ __html: description }} />
    </div>
  );
}
