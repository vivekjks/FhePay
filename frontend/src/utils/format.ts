const TEN = 10n;
export const UINT128_MAX = (1n << 128n) - 1n;

export function parseDecimalToUnits(value: string, decimals: number): bigint | null {
  const trimmed = value.trim();
  if (!/^\d*(\.\d+)?$/.test(trimmed) || trimmed === '' || trimmed === '.') return null;

  const [wholePart = '0', fractionPart = ''] = trimmed.split('.');
  if (fractionPart.length > decimals) return null;

  try {
    const whole = BigInt(wholePart === '' ? '0' : wholePart);
    const fraction = BigInt((fractionPart + '0'.repeat(decimals)).slice(0, decimals) || '0');
    return whole * TEN ** BigInt(decimals) + fraction;
  } catch {
    return null;
  }
}

export function parseWholeNumber(value: string): bigint | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

export function isUint128(value: bigint): boolean {
  return value >= 0n && value <= UINT128_MAX;
}

export function formatUnits(value: bigint, decimals: number, maxFractionDigits = 6): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const divisor = TEN ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = abs % divisor;

  if (fraction === 0n) return `${negative ? '-' : ''}${whole.toString()}`;

  const paddedFraction = fraction.toString().padStart(decimals, '0');
  const shortened = paddedFraction.slice(0, Math.min(decimals, maxFractionDigits)).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.toString()}${shortened ? `.${shortened}` : ''}`;
}

export function formatEtherAmount(value: bigint, maxFractionDigits = 6): string {
  return `${formatUnits(value, 18, maxFractionDigits)} ETH`;
}

export function formatDuration(seconds: bigint | number): string {
  const total = typeof seconds === 'bigint' ? Number(seconds) : seconds;
  if (!Number.isFinite(total) || total <= 0) return '0s';

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatDateTime(seconds: bigint | number | null | undefined): string {
  if (seconds == null) return 'Not scheduled';
  const total = typeof seconds === 'bigint' ? Number(seconds) : seconds;
  if (!Number.isFinite(total) || total <= 0) return 'Ready now';
  return new Date(total * 1000).toLocaleString();
}

export function shortAddress(address?: string | null): string {
  if (!address) return 'Not connected';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
