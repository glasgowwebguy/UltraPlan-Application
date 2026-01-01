import { useState, useMemo } from 'react';
import { Search, X, Package } from 'lucide-react';
import type { NutritionProduct } from '../utils/nutritionDatabase';

export type SortOption = 'recently-used' | 'alphabetical' | 'by-category' | 'by-carbs' | 'by-sodium';

interface QuickAddProductsProps {
  products: NutritionProduct[];
  recentlyUsedProductNames?: string[];
  onAddProduct: (product: NutritionProduct) => void;
  onManageProducts?: () => void;
  showManageButton?: boolean;
  maxHeight?: string;
  columns?: number;
}

// Category display names with emojis
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "Gels": '🟢 Gels',
  "Drinks": '🥤 Drinks',
  "Electrolytes": '⚡ Electrolytes',
  "Bars": '🍫 Bars',
  "Real Food": '🍌 Real Food',
  "Other": '📦 Other',
};

export default function QuickAddProducts({
  products,
  recentlyUsedProductNames = [],
  onAddProduct,
  onManageProducts,
  showManageButton = true,
  maxHeight = 'max-h-64',
  columns = 2,
}: QuickAddProductsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recently-used');

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Get recently used products
  const recentlyUsedProducts = useMemo(() => {
    if (recentlyUsedProductNames.length === 0) return [];

    return recentlyUsedProductNames
      .map(name => products.find(p => p.name === name))
      .filter((p): p is NutritionProduct => p !== undefined)
      .slice(0, 10); // Limit to 10 most recent
  }, [products, recentlyUsedProductNames]);

  // Sort filtered products
  const sortedProducts = useMemo(() => {
    const productsToSort = [...filteredProducts];

    switch (sortOption) {
      case 'alphabetical':
        return productsToSort.sort((a, b) => a.name.localeCompare(b.name));

      case 'by-category':
        return productsToSort.sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.name.localeCompare(b.name);
        });

      case 'by-carbs':
        return productsToSort.sort((a, b) => b.defaultCarbs - a.defaultCarbs);

      case 'by-sodium':
        return productsToSort.sort((a, b) => b.defaultSodium - a.defaultSodium);

      case 'recently-used':
      default:
        // Put recently used first, then alphabetical
        const recentlyUsedNames = new Set(recentlyUsedProductNames);
        return productsToSort.sort((a, b) => {
          const aIsRecent = recentlyUsedNames.has(a.name);
          const bIsRecent = recentlyUsedNames.has(b.name);

          if (aIsRecent && !bIsRecent) return -1;
          if (!aIsRecent && bIsRecent) return 1;

          // Both recent or both not recent - sort alphabetically
          return a.name.localeCompare(b.name);
        });
    }
  }, [filteredProducts, sortOption, recentlyUsedProductNames]);

  // Group by category if needed
  const groupedProducts = useMemo(() => {
    if (sortOption !== 'by-category') return null;

    const groups: Record<string, NutritionProduct[]> = {};
    sortedProducts.forEach(product => {
      if (!groups[product.category]) {
        groups[product.category] = [];
      }
      groups[product.category].push(product);
    });

    return groups;
  }, [sortedProducts, sortOption]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const matchingCount = filteredProducts.length;
  const totalCount = products.length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick Add Products</h4>
        {showManageButton && onManageProducts && (
          <button
            type="button"
            onClick={onManageProducts}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all"
          >
            <Package className="w-4 h-4" />
            Manage Products
          </button>
        )}
      </div>

      {/* Search and Sort Controls */}
      <div className="mb-3 space-y-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-10 py-2 bg-white dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort and Count Row */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">
            {searchQuery
              ? `Showing ${matchingCount} of ${totalCount} products`
              : `${totalCount} products`}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-2 py-1 bg-white dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="recently-used">Recently Used</option>
              <option value="alphabetical">Alphabetical (A-Z)</option>
              <option value="by-category">By Category</option>
              <option value="by-carbs">By Carbs (High→Low)</option>
              <option value="by-sodium">By Sodium (High→Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className={`${maxHeight} overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2`}>
        {/* Recently Used Section (only show if not searching and we have recently used products) */}
        {!searchQuery && recentlyUsedProducts.length > 0 && sortOption === 'recently-used' && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1">
              <span>⏱️</span>
              <span>Recently Used</span>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-${columns} gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700`}>
              {recentlyUsedProducts.map((product, index) => (
                <ProductCard
                  key={`recent-${product.name}-${index}`}
                  product={product}
                  onAdd={onAddProduct}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main Products Section */}
        {groupedProducts ? (
          // Category-grouped view
          <div className="space-y-4">
            {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
              <div key={category}>
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  {CATEGORY_DISPLAY_NAMES[category] || category}
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-${columns} gap-2`}>
                  {categoryProducts.map((product, index) => (
                    <ProductCard
                      key={`${product.name}-${index}`}
                      product={product}
                      onAdd={onAddProduct}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Standard grid view
          <>
            {!searchQuery && recentlyUsedProducts.length > 0 && sortOption === 'recently-used' && (
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                🏷️ All Products
              </div>
            )}
            <div className={`grid grid-cols-1 sm:grid-cols-${columns} gap-2`}>
              {sortedProducts
                .filter(product => {
                  // Exclude recently used products from "All Products" section in recently-used mode
                  if (sortOption === 'recently-used' && !searchQuery && recentlyUsedProducts.length > 0) {
                    return !recentlyUsedProductNames.includes(product.name);
                  }
                  return true;
                })
                .map((product, index) => (
                  <ProductCard
                    key={`${product.name}-${index}`}
                    product={product}
                    onAdd={onAddProduct}
                  />
                ))}
            </div>
          </>
        )}

        {/* No Results */}
        {matchingCount === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No products found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Product Card Component
interface ProductCardProps {
  product: NutritionProduct;
  onAdd: (product: NutritionProduct) => void;
}

function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      className="px-3 py-2 text-sm font-medium bg-white dark:bg-[#3a4458] text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-orange-500 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-[#4a5568] transition-all text-left"
    >
      <div className="font-medium text-gray-900 dark:text-white mb-1">{product.name}</div>
      <div className="text-xs flex flex-wrap gap-x-3 gap-y-1">
        <span>
          <span className="text-gray-500 dark:text-gray-400">Carbs:</span>{' '}
          <span className="text-green-600 dark:text-green-400 font-medium">{product.defaultCarbs}g</span>
        </span>
        <span>
          <span className="text-gray-500 dark:text-gray-400">Sodium:</span>{' '}
          <span className="text-blue-600 dark:text-blue-400 font-medium">{product.defaultSodium}mg</span>
        </span>
        {product.defaultWater > 0 && (
          <span>
            <span className="text-gray-500 dark:text-gray-400">Water:</span>{' '}
            <span className="text-cyan-600 dark:text-cyan-400 font-medium">{product.defaultWater}ml</span>
          </span>
        )}
      </div>
    </button>
  );
}
