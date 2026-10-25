'use client';

import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Package, Tag, AlertCircle } from 'lucide-react';
import { ExecutiveInsights } from '../../lib/types';

interface ProductCategoryBreakdownChartProps {
  insights: ExecutiveInsights;
  onFilterProduct?: (product: string) => void;
  onFilterCategory?: (category: string) => void;
  selectedProduct?: string;
  selectedCategory?: string;
}

export const ProductCategoryBreakdownChart: React.FC<ProductCategoryBreakdownChartProps> = ({
  insights,
  onFilterProduct,
  onFilterCategory,
  selectedProduct,
  selectedCategory
}) => {
  const hasProduct = insights.has_product_column && (insights.product_breakdown?.length ?? 0) > 0;
  const hasCategory = insights.has_category_column && (insights.category_breakdown?.length ?? 0) > 0;

  // Default active tab to whichever exists
  const [activeTab, setActiveTab] = useState<'product' | 'category'>(
    hasProduct ? 'product' : 'category'
  );

  const currentData = activeTab === 'product' 
    ? (insights.product_breakdown || [])
    : (insights.category_breakdown || []);

  const chartData = currentData.slice(0, 8).map((item) => ({
    name: item.name.length > 20 ? item.name.substring(0, 18) + '...' : item.name,
    fullName: item.name,
    Positive: item.positive_count,
    Neutral: item.neutral_count,
    Negative: item.negative_count,
    total: item.count,
    percentage: item.percentage
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const full = payload[0].payload.fullName;
      const total = payload[0].payload.total;
      const pct = payload[0].payload.percentage;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5">
          <div className="border-b border-slate-800 pb-1">
            <p className="font-semibold text-white">{full}</p>
            <p className="text-[10px] text-slate-400 font-mono">{pct}% of sub-segment feedback</p>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Positive:</span>
            <span className="font-semibold">{payload[0].payload.Positive}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-amber-400">
            <span>Neutral:</span>
            <span className="font-semibold">{payload[0].payload.Neutral}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-rose-400">
            <span>Negative:</span>
            <span className="font-semibold">{payload[0].payload.Negative}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-300 pt-1 border-t border-slate-800 font-mono">
            <span>Total Records:</span>
            <span className="text-white font-semibold">{total}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const hasAnyBreakdown = hasProduct || hasCategory;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
      {/* Header & Segment Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              {activeTab === 'product' ? 'Product Breakdown' : 'Category / Channel Breakdown'}
            </h3>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
              {currentData.length} identified
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sentiment and volume distribution across mapped dimensions (Click to filter)
          </p>
        </div>

        {/* Tab switchers */}
        {hasAnyBreakdown && (
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            {hasProduct && (
              <button
                onClick={() => setActiveTab('product')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'product'
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Products</span>
              </button>
            )}
            {hasCategory && (
              <button
                onClick={() => setActiveTab('category')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'category'
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Channels / Categories</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {!hasAnyBreakdown ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-lg border border-slate-800/80 space-y-2.5">
          <AlertCircle className="w-6 h-6 text-slate-400" />
          <p className="text-xs font-semibold text-slate-300">
            No Product or Category Columns Mapped
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm">
            Map optional product or channel/category fields during file ingestion to unlock dimensional sentiment breakdown.
          </p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
          <p>No records match the current filter selection.</p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <XAxis type="number" stroke="#64748B" fontSize={11} />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#94A3B8" 
                fontSize={11} 
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="Positive" 
                stackId="a" 
                fill="#10B981" 
                cursor="pointer"
                onClick={(entry: any) => {
                  if (activeTab === 'product' && onFilterProduct) {
                    onFilterProduct(selectedProduct === entry.fullName ? 'all' : entry.fullName);
                  } else if (activeTab === 'category' && onFilterCategory) {
                    onFilterCategory(selectedCategory === entry.fullName ? 'all' : entry.fullName);
                  }
                }}
              />
              <Bar 
                dataKey="Neutral" 
                stackId="a" 
                fill="#F59E0B" 
                cursor="pointer"
                onClick={(entry: any) => {
                  if (activeTab === 'product' && onFilterProduct) {
                    onFilterProduct(selectedProduct === entry.fullName ? 'all' : entry.fullName);
                  } else if (activeTab === 'category' && onFilterCategory) {
                    onFilterCategory(selectedCategory === entry.fullName ? 'all' : entry.fullName);
                  }
                }}
              />
              <Bar 
                dataKey="Negative" 
                stackId="a" 
                fill="#F43F5E" 
                radius={[0, 4, 4, 0]} 
                cursor="pointer"
                onClick={(entry: any) => {
                  if (activeTab === 'product' && onFilterProduct) {
                    onFilterProduct(selectedProduct === entry.fullName ? 'all' : entry.fullName);
                  } else if (activeTab === 'category' && onFilterCategory) {
                    onFilterCategory(selectedCategory === entry.fullName ? 'all' : entry.fullName);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
