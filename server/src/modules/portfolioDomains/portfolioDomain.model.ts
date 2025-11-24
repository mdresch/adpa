// PortfolioDomain model for PMI domains

export interface PortfolioDomain {
  id: string;
  name: string;
  description: any; // Markdown JSONB
  created_at: string;
  updated_at: string;
}
