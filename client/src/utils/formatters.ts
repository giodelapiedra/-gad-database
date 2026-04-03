import type { Status } from '../types';

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter((word) => word.length > 0)
    .map((word) => word[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
}

export function getGenderColor(gender: string): string {
  return gender === 'FEMALE' ? '#E11D48' : '#2563EB';
}

export function getStatusColor(status: Status): { bg: string; text: string } {
  switch (status) {
    case 'ACTIVE':
      return { bg: 'bg-green-50', text: 'text-green-700' };
    case 'PENDING':
      return { bg: 'bg-amber-50', text: 'text-amber-700' };
    case 'INACTIVE':
      return { bg: 'bg-red-50', text: 'text-red-700' };
  }
}
