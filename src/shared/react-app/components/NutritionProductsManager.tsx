import { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Download, Upload, Trash2, Edit2, Save, Search, Check, AlertCircle, Package,
  EyeOff
} from 'lucide-react';
import { localStorageService } from '../services/localStorage';
import { NUTRITION_DATABASE } from '../utils/nutritionDatabase';
import type { UserNutritionProduct, NutritionProductsExport } from '@/shared/types';

interface NutritionProductsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onProductsUpdated?: () => void;
}

const CATEGORIES = ['Gels', 'Bars', 'Drinks', 'Electrolytes', 'Real Food', 'Other'];

export default function NutritionProductsManager({
  isOpen,
  onClose,
  onProductsUpdated,
}: NutritionProductsManagerProps) {
  const [products, setProducts] = useState<UserNutritionProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'category' | 'alphabetical'>('category');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<UserNutritionProduct | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    carbsPerServing: 0,
    sodiumPerServing: 0,
    waterPerServing: 0,
    caffeinePerServing: 0,
    servingSize: '',
    category: 'Gels',
    brand: '',
    notes: '',
    excludeFromSmartFill: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load products on mount
  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = () => {
    const loaded = localStorageService.getUserNutritionProducts();

    // Seed with NUTRITION_DATABASE products on first use
    if (loaded.length === 0) {
      const databaseProducts: UserNutritionProduct[] = NUTRITION_DATABASE.map((product, index) => ({
        id: `db_${Date.now()}_${index}`,
        name: product.name,
        carbsPerServing: product.defaultCarbs,
        sodiumPerServing: product.defaultSodium,
        waterPerServing: product.defaultWater,
        servingSize: product.servingSize,
        category: product.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Import all database products
      databaseProducts.forEach(product => {
        localStorageService.saveUserNutritionProduct(product);
      });

      // Reload to get the seeded products
      const reloaded = localStorageService.getUserNutritionProducts();
      setProducts(reloaded);
      setMessage({ type: 'success', text: `Loaded ${reloaded.length} preset products into your library!` });
    } else {
      setProducts(loaded);
    }
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const resetForm = () => {
    setFormData({
      name: '',
      carbsPerServing: 0,
      sodiumPerServing: 0,
      waterPerServing: 0,
      caffeinePerServing: 0,
      servingSize: '',
      category: 'Gels',
      brand: '',
      notes: '',
      excludeFromSmartFill: false,
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const handleAddProduct = () => {
    if (!formData.name.trim() || !formData.servingSize.trim()) {
      setMessage({ type: 'error', text: 'Name and serving size are required' });
      return;
    }

    const newProduct: UserNutritionProduct = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      name: formData.name.trim(),
      carbsPerServing: formData.carbsPerServing,
      sodiumPerServing: formData.sodiumPerServing,
      waterPerServing: formData.waterPerServing,
      caffeinePerServing: formData.caffeinePerServing || undefined,
      servingSize: formData.servingSize.trim(),
      category: formData.category,
      brand: formData.brand.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      excludeFromSmartFill: formData.excludeFromSmartFill || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorageService.saveUserNutritionProduct(newProduct);
    loadProducts();
    onProductsUpdated?.();
    resetForm();
    setMessage({ type: 'success', text: 'Product added successfully!' });
  };

  const handleEditProduct = (product: UserNutritionProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      carbsPerServing: product.carbsPerServing,
      sodiumPerServing: product.sodiumPerServing,
      waterPerServing: product.waterPerServing,
      caffeinePerServing: product.caffeinePerServing || 0,
      servingSize: product.servingSize,
      category: product.category || 'Gels',
      brand: product.brand || '',
      notes: product.notes || '',
      excludeFromSmartFill: product.excludeFromSmartFill || false,
    });
    setShowAddForm(true);
  };

  const handleUpdateProduct = () => {
    if (!editingProduct || !formData.name.trim() || !formData.servingSize.trim()) {
      setMessage({ type: 'error', text: 'Name and serving size are required' });
      return;
    }

    const updatedProduct: UserNutritionProduct = {
      ...editingProduct,
      name: formData.name.trim(),
      carbsPerServing: formData.carbsPerServing,
      sodiumPerServing: formData.sodiumPerServing,
      waterPerServing: formData.waterPerServing,
      caffeinePerServing: formData.caffeinePerServing || undefined,
      servingSize: formData.servingSize.trim(),
      category: formData.category,
      brand: formData.brand.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      excludeFromSmartFill: formData.excludeFromSmartFill || undefined,
      updatedAt: new Date().toISOString(),
    };

    localStorageService.saveUserNutritionProduct(updatedProduct);
    loadProducts();
    onProductsUpdated?.();
    resetForm();
    setMessage({ type: 'success', text: 'Product updated successfully!' });
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      localStorageService.deleteUserNutritionProduct(productId);
      loadProducts();
      onProductsUpdated?.();
      setMessage({ type: 'success', text: 'Product deleted successfully!' });
    }
  };

  // Export to local JSON file
  const handleExportLocal = () => {
    const exportData = localStorageService.exportNutritionProducts();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultraplan_nutrition_products_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Products exported successfully!' });
  };

  // Import from local JSON file
  const handleImportLocal = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as NutritionProductsExport;

      // Validate format
      if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Invalid file format');
      }

      const result = localStorageService.importNutritionProducts(data.products, false);
      loadProducts();
      onProductsUpdated?.();

      setMessage({
        type: 'success',
        text: `Imported ${result.imported} products, skipped ${result.skipped} duplicates`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import products. Invalid file format.' });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else {
        // Sort by category first, then alphabetically within category
        if (a.category !== b.category) {
          return (a.category || '').localeCompare(b.category || '');
        }
        return a.name.localeCompare(b.name);
      }
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-[#2a3441] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-purple-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Nutrition Products
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-6 mt-4 px-4 py-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
          }`}>
            {message.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Actions Row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
            <button
              type="button"
              onClick={handleExportLocal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              disabled={products.length === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportLocal}
                className="hidden"
              />
            </label>
            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {products.length} product{products.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Search and Filter Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'category' | 'alphabetical')}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
            >
              <option value="category">Sort by Category</option>
              <option value="alphabetical">Sort Alphabetically</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-purple-500/20">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                    placeholder="e.g., GU Energy Gel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                    placeholder="e.g., GU"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Serving Size *
                  </label>
                  <input
                    type="text"
                    value={formData.servingSize}
                    onChange={(e) => setFormData({ ...formData, servingSize: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                    placeholder="e.g., gel, bar, 500ml"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.carbsPerServing}
                    onChange={(e) => setFormData({ ...formData, carbsPerServing: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sodium (mg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.sodiumPerServing}
                    onChange={(e) => setFormData({ ...formData, sodiumPerServing: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Water (ml)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.waterPerServing}
                    onChange={(e) => setFormData({ ...formData, waterPerServing: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Caffeine (mg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.caffeinePerServing}
                    onChange={(e) => setFormData({ ...formData, caffeinePerServing: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 100 for caffeinated gel"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave 0 for non-caffeinated products
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.excludeFromSmartFill}
                      onChange={(e) => setFormData({ ...formData, excludeFromSmartFill: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Exclude from Smart Fill suggestions
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                    When checked, this product will not be suggested by Smart Fill
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingProduct ? 'Update' : 'Add'} Product
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {products.length === 0 ? 'No products yet' : 'No products match your search'}
              </p>
              {products.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="text-purple-500 hover:text-purple-600 font-medium"
                >
                  Add your first product
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {product.name}
                        </h4>
                        {product.excludeFromSmartFill && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                            title="Excluded from Smart Fill suggestions"
                          >
                            <EyeOff className="w-3 h-3" />
                            <span className="hidden sm:inline">No Smart Fill</span>
                          </span>
                        )}
                      </div>
                      {product.brand && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {product.brand}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => handleEditProduct(product)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Serving:</span>
                      <span className="font-medium">{product.servingSize}</span>
                    </div>
                    {product.carbsPerServing > 0 && (
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Carbs:</span>
                        <span className="font-medium">{product.carbsPerServing}g</span>
                      </div>
                    )}
                    {product.sodiumPerServing > 0 && (
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Sodium:</span>
                        <span className="font-medium">{product.sodiumPerServing}mg</span>
                      </div>
                    )}
                    {product.waterPerServing > 0 && (
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Water:</span>
                        <span className="font-medium">{product.waterPerServing}ml</span>
                      </div>
                    )}
                    {product.caffeinePerServing && product.caffeinePerServing > 0 && (
                      <div className="flex justify-between text-orange-600 dark:text-orange-400">
                        <span>Caffeine:</span>
                        <span className="font-medium">{product.caffeinePerServing}mg</span>
                      </div>
                    )}
                  </div>
                  {product.category && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        {product.category}
                      </span>
                    </div>
                  )}
                  {product.notes && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {product.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
