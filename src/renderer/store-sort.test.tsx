import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { sortCatalogProducts, StoreProductCard } from './App';
import type { CatalogProduct, GamePassTier } from '../shared/types';

const product = (title: string, gamePassTier?: GamePassTier, includedWith?: string): CatalogProduct => ({
  productId: title.toUpperCase().padEnd(12, 'X').slice(0, 12), title, description: '', categories: [],
  installability: 'supported', supportNote: '', gamePassTier, includedWith,
});

it('keeps Microsoft Store relevance unless sorting by Game Pass tier', () => {
  const results = [product('Not in pass'), product('Ultimate', 'ultimate'), product('Essential', 'essential'),
    product('Second premium', 'premium'), product('Also not in pass'), product('PC', 'pc'), product('First premium', 'premium')];
  expect(sortCatalogProducts(results, 'relevance')).toBe(results);
  expect(sortCatalogProducts(results, 'pass-tier').map(item => item.title)).toEqual(
    ['Essential', 'Second premium', 'First premium', 'PC', 'Ultimate', 'Not in pass', 'Also not in pass']);
  expect(results[0].title).toBe('Not in pass');
});

it('ranks Store pass games without a known PC tier after tiered games but ahead of retail-only games', () => {
  const results = [product('Retail'), product('EA Play only', undefined, 'EA Play'), product('Ultimate', 'ultimate')];
  expect(sortCatalogProducts(results, 'pass-tier').map(item => item.title)).toEqual(['Ultimate', 'EA Play only', 'Retail']);
});

it('names the lowest Game Pass tier on Store cards, falling back to the Store pass name', () => {
  const card = (value: CatalogProduct) => renderToStaticMarkup(<StoreProductCard product={{ ...value, purchasePrice: '$29.99' }} selected={false} disabled={false} label="Install" select={() => {}} install={() => {}} />);
  expect(card(product('Tiered', 'pc', 'Xbox Game Pass'))).toContain('<span>$29.99 · PC Game Pass</span>');
  expect(card(product('Untiered', undefined, 'Xbox Game Pass'))).toContain('<span>$29.99 · Xbox Game Pass</span>');
  expect(card(product('Retail only'))).toContain('<span>$29.99</span>');
});
