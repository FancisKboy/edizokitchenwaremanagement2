'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/modal'
import { useAppPreferences } from '@/app/providers'

const PRODUCT_IMAGE_BUCKET = 'product-images'

type Product = {
  id: string
  name: string
  status?: string | null
}

type ProductType = {
  id: string
  product_id: string
  name: string
  description: string | null
  image_path: string | null
  minimum_stock: number
  status: string
}

type Batch = {
  id: string
  product_type_id: string
  batch_number: string
  received_at: string
  original_quantity: number
  remaining_quantity: number
  unit_cost: number
  attachment_path: string | null
  status: string
  created_at: string
}

type InventoryRow = {
  productType: ProductType
  product: Product | null
  batches: Batch[]
  stock: number
  stockValue: number
}

/* =========================================================
   TRANSLATIONS
========================================================= */

const INVENTORY_TRANSLATIONS: Record<string, string> = {
  'Stock Control': 'Kugenzura Ububiko',
  Inventory: 'Ububiko',
  'Monitor your kitchenware stock, product types, batches and current inventory value.':
    "Gukurikirana ibikoresho byo mu gikoni, amoko yabyo, amatsinda (batches) n'agaciro k'ububiko muri iki gihe.",
  'Refresh Inventory': 'Vugurura Ububiko',
  'Refreshing...': 'Biravugururwa...',
  'Inventory could not load completely.': 'Ububiko ntabwo bwabonetse neza.',
  'Try Again': 'Ongera Ugerageze',
  Overview: 'Incamake',
  'Stock at a Glance': 'Ububiko muri Rusange',
  'Product Types': "Amoko y'Ibicuruzwa",
  'Active types / kinds': 'Amoko akora',
  'Units in Stock': 'Ingano mu Bubiko',
  'Across all active batches': 'Muri za batch zose zikora',
  'Stock Value': "Agaciro k'Ububiko",
  'Current inventory cost value': "Agaciro k'ikiguzi cy'ububiko",
  'Stock Attention': 'Ibyitonderwa mu Bubiko',
  Available: 'Birahari',
  'Low Stock': 'Biri Hafi Gushira',
  'Out of Stock': 'Byashize',
  'In Stock': 'Birahari',
  'Find Stock': 'Shakisha Ububiko',
  'Search & Filters': 'Gushakisha & Kuyungurura',
  Search: 'Shakisha',
  'Product, type, or batch...': 'Igicuruzwa, ubwoko, cyangwa batch...',
  Product: 'Igicuruzwa',
  'All Products': 'Ibicuruzwa Byose',
  'Search product...': 'Shakisha igicuruzwa...',
  'Stock Status': "Imiterere y'Ububiko",
  'All Stock': 'Ububiko Bwose',
  'Active filters:': 'Ibyatoranyijwe:',
  'Clear all': 'Siba byose',
  'Inventory Records': "Inyandiko z'Ububiko",
  'Stock Overview': "Imiterere y'Ububiko",
  Product_TH: 'Igicuruzwa',
  'Type / Kind': 'Ubwoko',
  Stock: 'Ububiko',
  Minimum: 'Ibyibuze',
  Batches: 'Amatsinda',
  Status: 'Imiterere',
  Action: 'Igikorwa',
  'Unknown product': 'Igicuruzwa kitazwi',
  units: 'ibice',
  View: 'Reba',
  'Loading inventory...': 'Gupakurura ububiko...',
  'Reading products, types and batches.':
    "Gusoma ibicuruzwa, amoko, n'amatsinda.",
  'No inventory found': 'Nta bubiko bwabonetse',
  'Try changing your search or stock filters. Active product types will appear here.':
    "Gerageza guhindura ibyo washakishije. Amoko y'ibicuruzwa azagaragara hano.",
  'Inventory Details': "Amakuru Arambuye y'Ububiko",
  Close: 'Funga',
  'Product Type / Kind': "Ubwoko bw'Igicuruzwa",
  'No description has been added for this product type.':
    'Nta bisobanuro byatanzwe kuri ubu bwoko.',
  'Current Stock': 'Ububiko Buriho',
  'Minimum Stock': 'Ububiko bwa Ngombwa',
  'Batch Breakdown': 'Gusesengura Amatsinda',
  'Stock by Batch': 'Ububiko kuri buri Tsinda',
  'No batches found': 'Nta matsinda yabitswe',
  'This product type does not have any batch records yet.':
    "Ubu bwoko bw'igicuruzwa nta nyandiko za batch buragira.",
  Batch: 'Itsinda (Batch)',
  Received: 'Yakiriwe',
  Original: 'Umwimerere',
  Remaining: 'Ibisigaye',
  'Unit Cost': "Igiciro cy'Igice",
  'Remaining Value': "Agaciro k'Ibisigaye",
  'No image available': 'Nta foto ihari',
}

function translateInventory(text: string, isRw: boolean): string {
  if (!isRw) return text
  return INVENTORY_TRANSLATIONS[text] || text
}

function toNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-RW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-RW', {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getPublicImageUrl(imagePath: string | null) {
  if (!imagePath) return null
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath)
    .data.publicUrl
}

function getStockStatus(stock: number, minimumStock: number, isRw: boolean) {
  if (stock <= 0) {
    return {
      label: translateInventory('Out of Stock', isRw),
      className:
        'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
      dotClass: 'bg-rose-500',
    }
  }

  if (stock <= minimumStock) {
    return {
      label: translateInventory('Low Stock', isRw),
      className:
        'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
      dotClass: 'bg-amber-500',
    }
  }

  return {
    label: translateInventory('In Stock', isRw),
    className:
      'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    dotClass: 'bg-emerald-500',
  }
}

function getBatchStatusClass(status: string) {
  const value = status.toLowerCase()

  if (value.includes('finished')) {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }

  if (value.includes('low')) {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
  }

  if (value.includes('cancel')) {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
  }

  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ')
}

export default function InventoryPage() {
  const { t } = useAppPreferences()
  const isRw = t('inventory').trim().toLowerCase() !== 'inventory'
  const tx = (text: string) => translateInventory(text, isRw)

  const [products, setProducts] = useState<Product[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [batches, setBatches] = useState<Batch[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')

  const [selectedRow, setSelectedRow] = useState<InventoryRow | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const loadInventory = useCallback(async () => {
    try {
      setError('')

      const [productsResult, productTypesResult, batchesResult] =
        await Promise.all([
          supabase.from('products').select('id, name, status').order('name'),
          supabase
            .from('product_types')
            .select(
              'id, product_id, name, description, image_path, minimum_stock, status'
            )
            .order('name'),
          supabase
            .from('batches')
            .select(
              'id, product_type_id, batch_number, received_at, original_quantity, remaining_quantity, unit_cost, attachment_path, status, created_at'
            )
            .order('received_at', { ascending: true }),
        ])

      if (productsResult.error) throw productsResult.error
      if (productTypesResult.error) throw productTypesResult.error
      if (batchesResult.error) throw batchesResult.error

      setProducts((productsResult.data || []) as Product[])
      setProductTypes((productTypesResult.data || []) as ProductType[])
      setBatches((batchesResult.data || []) as Batch[])
    } catch (err) {
      console.error('Inventory load error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load inventory.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  const inventoryRows = useMemo<InventoryRow[]>(() => {
    const productMap = new Map(products.map((product) => [product.id, product]))
    const batchesByProductType = new Map<string, Batch[]>()

    for (const batch of batches) {
      const existing = batchesByProductType.get(batch.product_type_id) || []
      existing.push(batch)
      batchesByProductType.set(batch.product_type_id, existing)
    }

    return productTypes
      .filter((productType) => productType.status !== 'inactive')
      .map((productType) => {
        const typeBatches = batchesByProductType.get(productType.id) || []
        const stock = typeBatches.reduce(
          (total, batch) =>
            total + Math.max(toNumber(batch.remaining_quantity), 0),
          0
        )

        const stockValue = typeBatches.reduce((total, batch) => {
          const quantity = Math.max(toNumber(batch.remaining_quantity), 0)
          const unitCost = toNumber(batch.unit_cost)
          return total + quantity * unitCost
        }, 0)

        return {
          productType,
          product: productMap.get(productType.product_id) || null,
          batches: typeBatches,
          stock,
          stockValue,
        }
      })
  }, [products, productTypes, batches])

  const filteredRows = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return inventoryRows.filter((row) => {
      const matchesSearch =
        !searchValue ||
        row.productType.name.toLowerCase().includes(searchValue) ||
        row.product?.name.toLowerCase().includes(searchValue) ||
        row.batches.some((batch) =>
          batch.batch_number.toLowerCase().includes(searchValue)
        )

      const matchesProduct =
        productFilter === 'all' || row.productType.product_id === productFilter

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'out' && row.stock <= 0) ||
        (stockFilter === 'low' &&
          row.stock > 0 &&
          row.stock <= row.productType.minimum_stock) ||
        (stockFilter === 'available' &&
          row.stock > row.productType.minimum_stock)

      return matchesSearch && matchesProduct && matchesStock
    })
  }, [inventoryRows, search, productFilter, stockFilter])

  const totalTypes = inventoryRows.length
  const totalUnits = inventoryRows.reduce((total, row) => total + row.stock, 0)
  const totalStockValue = inventoryRows.reduce(
    (total, row) => total + row.stockValue,
    0
  )

  const lowStockCount = inventoryRows.filter(
    (row) => row.stock > 0 && row.stock <= row.productType.minimum_stock
  ).length

  const outOfStockCount = inventoryRows.filter((row) => row.stock <= 0).length

  const availableCount = inventoryRows.filter(
    (row) => row.stock > row.productType.minimum_stock
  ).length

  function handleRefresh() {
    setRefreshing(true)
    loadInventory()
  }

  function openDetails(row: InventoryRow) {
    setSelectedRow(row)
    setDetailsOpen(true)
  }

  function closeDetails() {
    setDetailsOpen(false)
    setSelectedRow(null)
  }

  const selectedImageUrl = selectedRow
    ? getPublicImageUrl(selectedRow.productType.image_path)
    : null

  const selectedStatus = selectedRow
    ? getStockStatus(
        selectedRow.stock,
        selectedRow.productType.minimum_stock,
        isRw
      )
    : null

  return (
    <main className="min-h-full space-y-6 bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {tx('Stock Control')}
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                {tx('Inventory')}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {tx(
                  'Monitor your kitchenware stock, product types, batches and current inventory value.'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshIcon className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? tx('Refreshing...') : tx('Refresh Inventory')}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">
                  {tx('Inventory could not load completely.')}
                </p>
                <p className="mt-1 break-words text-xs opacity-80">{error}</p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                {tx('Try Again')}
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {tx('Overview')}
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
            {tx('Stock at a Glance')}
          </h2>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title={tx('Product Types')}
            value={formatNumber(totalTypes)}
            description={tx('Active types / kinds')}
            icon={<TypeIcon />}
            accent="indigo"
          />

          <SummaryCard
            title={tx('Units in Stock')}
            value={formatNumber(totalUnits)}
            description={tx('Across all active batches')}
            icon={<BoxIcon />}
            accent="blue"
          />

          <SummaryCard
            title={tx('Stock Value')}
            value={`${formatMoney(totalStockValue)} RWF`}
            description={tx('Current inventory cost value')}
            icon={<MoneyIcon />}
            accent="emerald"
          />

          <SummaryCard
            title={tx('Stock Attention')}
            value={formatNumber(lowStockCount + outOfStockCount)}
            description={
              isRw
                ? `${lowStockCount} biri hasi • ${outOfStockCount} byashize`
                : `${lowStockCount} low • ${outOfStockCount} out`
            }
            icon={<WarningIcon />}
            accent="amber"
          />
        </div>

        {/* Status strip */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatusStat
            label={tx('Available')}
            value={availableCount}
            icon={<CheckIcon />}
            className="text-emerald-600 dark:text-emerald-400"
          />

          <StatusStat
            label={tx('Low Stock')}
            value={lowStockCount}
            icon={<WarningIcon />}
            className="text-amber-600 dark:text-amber-400"
          />

          <StatusStat
            label={tx('Out of Stock')}
            value={outOfStockCount}
            icon={<AlertIcon />}
            className="text-rose-600 dark:text-rose-400"
          />
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              {tx('Find Stock')}
            </p>

            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {tx('Search & Filters')}
            </h2>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {/* Small text search */}
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tx('Search')}
              </label>

              <div className="relative">
                <SearchIcon />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={tx('Product, type, or batch...')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950"
                />
              </div>
            </div>

            {/* Small, searchable and scrollable product filter */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tx('Product')}
              </label>

              <SearchableProductSelect
                products={products}
                selectedProductId={productFilter}
                onSelect={(id) => setProductFilter(id)}
                allLabel={tx('All Products')}
                searchPlaceholder={tx('Search product...')}
                noResultsText={tx('No inventory found')}
              />
            </div>

            {/* Small stock status filter */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tx('Stock Status')}
              </label>

              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">{tx('All Stock')}</option>
                <option value="available">{tx('Available')}</option>
                <option value="low">{tx('Low Stock')}</option>
                <option value="out">{tx('Out of Stock')}</option>
              </select>
            </div>
          </div>

          {(search || productFilter !== 'all' || stockFilter !== 'all') && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                {tx('Active filters:')}
              </span>

              {search && (
                <FilterBadge
                  label={`${tx('Search')}: ${search}`}
                  onClear={() => setSearch('')}
                />
              )}

              {productFilter !== 'all' && (
                <FilterBadge
                  label={`${tx('Product')}: ${
                    products.find((p) => p.id === productFilter)?.name ||
                    productFilter
                  }`}
                  onClear={() => setProductFilter('all')}
                />
              )}

              {stockFilter !== 'all' && (
                <FilterBadge
                  label={`${tx('Stock Status')}: ${
                    stockFilter === 'available'
                      ? tx('Available')
                      : stockFilter === 'low'
                      ? tx('Low Stock')
                      : tx('Out of Stock')
                  }`}
                  onClear={() => setStockFilter('all')}
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setProductFilter('all')
                  setStockFilter('all')
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                {tx('Clear all')}
              </button>
            </div>
          )}
        </div>

        {/* Small & Scrollable Table */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  {tx('Inventory Records')}
                </p>

                <h2 className="mt-0.5 text-lg font-black text-slate-900 dark:text-white">
                  {tx('Stock Overview')}
                </h2>
              </div>

              <p className="text-xs text-slate-400">
                {isRw
                  ? `${filteredRows.length} kuri ${inventoryRows.length} amoko agaragajwe`
                  : `${filteredRows.length} of ${inventoryRows.length} types shown`}
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingState
              title={tx('Loading inventory...')}
              subtitle={tx('Reading products, types and batches.')}
            />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title={tx('No inventory found')}
              subtitle={tx(
                'Try changing your search or stock filters. Active product types will appear here.'
              )}
            />
          ) : (
            <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
              <table className="min-w-[1000px] w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-3.5 py-3 font-bold">{tx('Product_TH')}</th>
                    <th className="px-3.5 py-3 font-bold">{tx('Type / Kind')}</th>
                    <th className="px-3.5 py-3 font-bold">{tx('Stock')}</th>
                    <th className="px-3.5 py-3 font-bold">{tx('Minimum')}</th>
                    <th className="px-3.5 py-3 font-bold">{tx('Stock Value')}</th>
                    <th className="px-3.5 py-3 font-bold">{tx('Batches')}</th>
                    <th className="px-3.5 py-3 font-bold">{tx('Status')}</th>
                    <th className="px-3.5 py-3 text-right font-bold">
                      {tx('Action')}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRows.map((row) => {
                    const status = getStockStatus(
                      row.stock,
                      row.productType.minimum_stock,
                      isRw
                    )

                    const imageUrl = getPublicImageUrl(
                      row.productType.image_path
                    )

                    return (
                      <tr
                        key={row.productType.id}
                        className="group transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                              <ProductsIcon />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900 dark:text-white">
                                {row.product?.name || tx('Unknown product')}
                              </p>

                              <p className="text-[10px] text-slate-400">
                                {tx('Product')}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5">
                          <button
                            type="button"
                            onClick={() => openDetails(row)}
                            className="group/type flex items-center gap-2.5 text-left"
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={row.productType.name}
                                className="h-9 w-9 rounded-lg border border-slate-200 object-cover shadow-sm transition group-hover/type:scale-105 dark:border-slate-700"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition group-hover/type:scale-105 dark:bg-slate-800 dark:text-slate-300">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-bold text-indigo-700 transition group-hover/type:text-indigo-600 dark:text-indigo-400">
                                {row.productType.name}
                              </p>

                              {row.productType.description && (
                                <p className="max-w-[180px] truncate text-[10px] text-slate-400">
                                  {row.productType.description}
                                </p>
                              )}
                            </div>
                          </button>
                        </td>

                        <td className="px-3.5 py-2.5">
                          <p className="font-black text-slate-900 dark:text-white">
                            {formatNumber(row.stock)}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {tx('units')}
                          </p>
                        </td>

                        <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                          {formatNumber(
                            toNumber(row.productType.minimum_stock)
                          )}
                        </td>

                        <td className="px-3.5 py-2.5">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {formatMoney(row.stockValue)} RWF
                          </p>
                        </td>

                        <td className="px-3.5 py-2.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <BatchIcon className="h-3.5 w-3.5" />
                            {row.batches.length}
                          </span>
                        </td>

                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold ${status.className}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`}
                            />
                            {status.label}
                          </span>
                        </td>

                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => openDetails(row)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                          >
                            {tx('View')}
                            <ArrowIcon />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Details Modal */}
        <Modal
          open={detailsOpen}
          onClose={closeDetails}
          title={tx('Inventory Details')}
          description={
            selectedRow
              ? `${selectedRow.product?.name || tx('Unknown product')} → ${
                  selectedRow.productType.name
                }`
              : undefined
          }
          footer={
            <button
              type="button"
              onClick={closeDetails}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {tx('Close')}
            </button>
          }
        >
          {selectedRow && (
            <div className="space-y-6">
              {/* Product Type Hero */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  {/* IMAGE */}
                  <div className="relative min-h-[220px] bg-slate-100 dark:bg-slate-800">
                    {selectedImageUrl ? (
                      <img
                        src={selectedImageUrl}
                        alt={selectedRow.productType.name}
                        className="h-full min-h-[220px] w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-[220px] items-center justify-center">
                        <div className="text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-slate-900 dark:text-slate-500">
                            <ImageIcon className="h-8 w-8" />
                          </div>

                          <p className="mt-3 text-xs font-semibold text-slate-400">
                            {tx('No image available')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* INFORMATION */}
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                        {tx('Product Type / Kind')}
                      </span>

                      {selectedStatus && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${selectedStatus.className}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${selectedStatus.dotClass}`}
                          />
                          {selectedStatus.label}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {selectedRow.productType.name}
                    </h3>

                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {selectedRow.product?.name || tx('Unknown product')}
                    </p>

                    <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {selectedRow.productType.description ||
                        tx('No description has been added for this product type.')}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <InfoMetric
                        label={tx('Current Stock')}
                        value={formatNumber(selectedRow.stock)}
                      />

                      <InfoMetric
                        label={tx('Stock Value')}
                        value={`${formatMoney(selectedRow.stockValue)} RWF`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main metrics */}
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label={tx('Current Stock')}
                  value={formatNumber(selectedRow.stock)}
                  icon={<BoxIcon />}
                  accent="indigo"
                />

                <MetricCard
                  label={tx('Minimum Stock')}
                  value={formatNumber(
                    toNumber(selectedRow.productType.minimum_stock)
                  )}
                  icon={<TargetIcon />}
                  accent="amber"
                />

                <MetricCard
                  label={tx('Stock Value')}
                  value={`${formatMoney(selectedRow.stockValue)} RWF`}
                  icon={<MoneyIcon />}
                  accent="emerald"
                />
              </div>

              {/* Batch section */}
              <div>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      {tx('Batch Breakdown')}
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                      {tx('Stock by Batch')}
                    </h3>
                  </div>

                  <span className="text-xs text-slate-400">
                    {isRw
                      ? `${selectedRow.batches.length} ${
                          selectedRow.batches.length === 1
                            ? 'itsinda'
                            : 'amatsinda'
                        }`
                      : `${selectedRow.batches.length} batch${
                          selectedRow.batches.length === 1 ? '' : 'es'
                        }`}
                  </span>
                </div>

                {selectedRow.batches.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                    <BatchIcon className="mx-auto h-7 w-7 text-slate-400" />

                    <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                      {tx('No batches found')}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {tx(
                        'This product type does not have any batch records yet.'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="max-h-[360px] overflow-x-auto overflow-y-auto">
                      <table className="min-w-[850px] w-full text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                          <tr>
                            <th className="px-3.5 py-2.5 font-bold">
                              {tx('Batch')}
                            </th>
                            <th className="px-3.5 py-2.5 font-bold">
                              {tx('Received')}
                            </th>
                            <th className="px-3.5 py-2.5 font-bold">
                              {tx('Original')}
                            </th>
                            <th className="px-3.5 py-2.5 font-bold">
                              {tx('Remaining')}
                            </th>
                            <th className="px-3.5 py-2.5 font-bold">
                              {tx('Unit Cost')}
                            </th>
                            <th className="px-3.5 py-2.5 font-bold">
                              {tx('Remaining Value')}
                            </th>
                            <th className="px-3.5 py-2.5 font-bold">
                              {tx('Status')}
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedRow.batches.map((batch) => {
                            const remaining = Math.max(
                              toNumber(batch.remaining_quantity),
                              0
                            )

                            const original = Math.max(
                              toNumber(batch.original_quantity),
                              0
                            )

                            const unitCost = toNumber(batch.unit_cost)
                            const batchValue = remaining * unitCost

                            return (
                              <tr
                                key={batch.id}
                                className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                              >
                                <td className="px-3.5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                      <BatchIcon className="h-3.5 w-3.5" />
                                    </span>

                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {batch.batch_number}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                                  {formatDate(batch.received_at)}
                                </td>

                                <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                                  {formatNumber(original)}
                                </td>

                                <td className="px-3.5 py-2.5">
                                  <span className="font-black text-slate-900 dark:text-white">
                                    {formatNumber(remaining)}
                                  </span>
                                </td>

                                <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                                  {formatMoney(unitCost)} RWF
                                </td>

                                <td className="px-3.5 py-2.5">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {formatMoney(batchValue)} RWF
                                  </span>
                                </td>

                                <td className="px-3.5 py-2.5">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${getBatchStatusClass(
                                      batch.status
                                    )}`}
                                  >
                                    {formatStatus(batch.status)}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </main>
  )
}

/* ---------------- Small Searchable & Scrollable Product Combobox ---------------- */

function SearchableProductSelect({
  products,
  selectedProductId,
  onSelect,
  allLabel,
  searchPlaceholder,
  noResultsText,
}: {
  products: Product[]
  selectedProductId: string
  onSelect: (id: string) => void
  allLabel: string
  searchPlaceholder: string
  noResultsText: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, query])

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        <span className="truncate">
          {selectedProductId === 'all'
            ? allLabel
            : selectedProduct?.name || allLabel}
        </span>
        <ChevronDownIcon className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />

          <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="relative mb-1.5">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2.5 pr-2 text-xs outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  onSelect('all')
                  setOpen(false)
                  setQuery('')
                }}
                className={`w-full rounded-lg px-2.5 py-1.5 text-left transition ${
                  selectedProductId === 'all'
                    ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {allLabel}
              </button>

              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onSelect(product.id)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={`w-full truncate rounded-lg px-2.5 py-1.5 text-left transition ${
                    selectedProductId === product.id
                      ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {product.name}
                </button>
              ))}

              {filteredProducts.length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-slate-400">
                  {noResultsText}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Components ---------------- */

function SummaryCard({
  title,
  value,
  description,
  icon,
  accent,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  accent: 'indigo' | 'blue' | 'emerald' | 'amber'
}) {
  const classes = {
    indigo:
      'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber:
      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  }

  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">{description}</p>
        </div>

        <div
          className={`rounded-2xl p-3.5 transition group-hover:scale-105 ${classes[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusStat({
  label,
  value,
  icon,
  className,
}: {
  label: string
  value: number
  icon: React.ReactNode
  className: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={className}>{icon}</div>

      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>

        <p className="text-lg font-black text-slate-900 dark:text-white">
          {formatNumber(value)}
        </p>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: 'indigo' | 'amber' | 'emerald'
}) {
  const classes = {
    indigo:
      'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    amber:
      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${classes[accent]}`}>{icon}</div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{label}</p>

          <p className="mt-0.5 truncate text-base font-black text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>

      <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  )
}

function FilterBadge({
  label,
  onClear,
}: {
  label: string
  onClear: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
    >
      {label}
      <span className="text-indigo-400">×</span>
    </button>
  )
}

function LoadingState({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div className="flex min-h-[260px] items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400" />

        <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  )
}

function EmptyState({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div className="flex min-h-[260px] items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <BoxIcon className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white">
          {title}
        </h3>

        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      </div>
    </div>
  )
}

/* ---------------- Icons ---------------- */

function Icon({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M20 11a8 8 0 0 0-14-5L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14 5l2-2" />
      <path d="M20 20v-4h-4" />
    </Icon>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <Icon className="h-3.5 w-3.5">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  )
}

function BoxIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </Icon>
  )
}

function TypeIcon() {
  return (
    <Icon>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </Icon>
  )
}

function ProductsIcon() {
  return (
    <Icon className="h-4 w-4">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </Icon>
  )
}

function MoneyIcon() {
  return (
    <Icon>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h.01M17 15h.01" />
      <circle cx="12" cy="12" r="2.5" />
    </Icon>
  )
}

function WarningIcon() {
  return (
    <Icon>
      <path d="m12 3 9 17H3z" />
      <path d="M12 9v5M12 17v.01" />
    </Icon>
  )
}

function AlertIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16v.01" />
    </Icon>
  )
}

function CheckIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </Icon>
  )
}

function BatchIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
    </Icon>
  )
}

function ImageIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4 17 5-5 3 3 2-2 6 5" />
    </Icon>
  )
}

function TargetIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </Icon>
  )
}
