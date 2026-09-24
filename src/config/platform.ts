// Configurações Globais da Marca e Plataforma Norto
export const PLATFORM_CONFIG = {
  name: 'Norto ENEM',
  tagline: 'ESTUDE. PRATIQUE. EVOLUA.',
  description: 'Plataforma digital de alta performance para preparação do ENEM e grandes vestibulares.',
  currentProduct: 'enem',
  version: '1.0.0',
  defaultTargetExam: 'ENEM 2026',
  examDate: '2026-11-08T13:00:00.000Z',
  supportEmail: 'suporte@norto.com.br',
} as const;

export type ProductId = 'enem' | 'concursos' | 'medicina';

export interface ProductDefinition {
  id: ProductId;
  name: string;
  badge: string;
  isAvailable: boolean;
}

export const AVAILABLE_PRODUCTS: ProductDefinition[] = [
  { id: 'enem', name: 'Norto ENEM', badge: 'Ativo', isAvailable: true },
  { id: 'concursos', name: 'Norto Concursos', badge: 'Em Breve', isAvailable: false },
  { id: 'medicina', name: 'Norto Med Top', badge: 'Em Breve', isAvailable: false },
];
