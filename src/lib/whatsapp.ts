/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Convert an SA local number (0xx xxx xxxx) to the international digits wa.me expects.
export function toWaNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '27' + digits.slice(1);
  return digits;
}

// A phone number is usable if it has 9–12 digits once formatting is stripped.
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 12;
}

// wa.me link; without a phone the user picks the contact inside WhatsApp.
export function waLink(text: string, phone?: string | null): string {
  const target = phone ? toWaNumber(phone) : '';
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}

// Mobile browsers block window.open() once an await has run, so open the tab
// synchronously inside the click handler and point it at the URL afterwards.
export function reserveTab() {
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  return {
    // Returns false if the browser blocked the tab, so callers can show a fallback link.
    go(url: string): boolean {
      if (!tab || tab.closed) return false;
      tab.location.href = url;
      return true;
    },
    cancel() {
      tab?.close();
    },
  };
}
