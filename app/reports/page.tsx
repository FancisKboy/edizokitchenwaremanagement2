'use client'

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '@/lib/supabase'
import { useAppPreferences } from '@/app/providers'

type Sale = {
  id: string
  customer_id: string | null
  sale_date: string
  total_revenue: number
  total_cost: number
  total_profit: number
  amount_paid: number
  amount_due: number
  payment_status: string
}

type SaleItem = {
  id: string
  sale_id: string
  product_type_id: string
  quantity: number
  selling_price: number
  revenue: number
  cost: number
  profit: number
}

type Payment = {
  id: string
  sale_id: string
  customer_id: string | null
  amount: number
  payment_date: string
  notes: string | null
}

type Product = {
  id: string
  name: string
}

type ProductType = {
  id: string
  product_id: string
  name: string
  status: string
}

type Batch = {
  id: string
  product_type_id: string
  remaining_quantity: number
  unit_cost: number
  status: string
}

type ProductTypeReport = {
  productTypeId: string
  productName: string
  productTypeName: string
  quantitySold: number
  revenue: number
  cost: number
  profit: number
}

/* =========================================================
   TRANSLATIONS
========================================================= */

const REPORT_TRANSLATIONS: Record<string, string> = {
  'Business Intelligence': "Amakuru y'Ubucuruzi",
  Reports: 'Raporo',
  "Understand today's sales, profit, payments, debts, and inventory at a glance.":
    "Sobanukirwa ibigurishwa, inyungu, ubwishyu, amadeni n'ububiko muri iki gihe.",
  'Live Data': 'Amakuru Ako Kanya',
  Print: 'Gucapa',
  'Export CSV': 'Gukuramo CSV',
  'Kitchenware Management Report': 'Raporo yo Gucunga Ibikoresho',
  'Report could not be loaded': 'Raporo ntiyabashije gufungurwa',
  'Report Period': 'Igihe cya Raporo',
  'Choose the period you want to analyse.':
    'Hitamo igihe wifuza gusesengura.',
  Today: 'Uyu munsi',
  Yesterday: 'Ejo hashize',
  'This Week': 'Iki cyumweru',
  'Start Date': 'Itariki yo Gutangira',
  'End Date': 'Itariki yo Gusoza',
  Refresh: 'Vugurura',
  'Building your report...': 'Raporo irimo gutegurwa...',
  'Loading sales, payments, and inventory.':
    "Gupakurura ibyagurishijwe, ubwishyu, n'ububiko.",
  'Financial Overview': "Incamake y'Imari",
  'Performance for': 'Imikorere ya',
  'Total Revenue': 'Amafaranga Yinjiye Yose',
  'Total Cost': 'Igiciro Cyose',
  'Total Profit': 'Inyungu Yose',
  'profit margin': "ijanisha ry'inyungu",
  'Outstanding Debt': 'Amadeni Asigaye',
  'Business Activity': "Ibikorwa by'Ubucuruzi",
  'Quick numbers for the selected period.':
    'Imibare muri make ku gihe wahisemo.',
  Sales: 'Ibyagurishijwe',
  'Items Sold': 'Ingano y’Ibyagurishijwe',
  'Payments Received': 'Amafaranga Yakiriwe',
  'Average Sale': "Impuzandengo y'Igurisha",
  'Current Stock': 'Ububiko Buhari',
  'Current inventory based on remaining quantities and exact batch supply costs.':
    "Ububiko buhari hashingiwe ku bisigaye n'igiciro cy'amatsinda.",
  'Units In Stock': 'Ibice Biri mu Bubiko',
  'Current Stock Value': "Agaciro k'Ububiko Buhari",
  'Payment Status': "Imiterere y'Ubwishyu",
  'How sales in this period were paid.':
    'Uko ibicuruzwa byishyuwe muri iki gihe.',
  'Paid Sales': 'Ibyishyuwe Byose',
  'Partial Sales': 'Ibyishyuwe Igice',
  'Unpaid Sales': 'Ibitishyurwa',
  'Product Type / Kind Performance': "Imikorere y'Amoko y'Ibicuruzwa",
  'The strongest product types and kinds during the selected period.':
    "Amoko y'ibicuruzwa yagurishijwe cyane muri iki gihe.",
  'No product sales yet': 'Nta bicuruzwa biragurishwa',
  'There are no product type sales for this period.':
    'Nta moko y’ibicuruzwa yagurishijwe muri iki gihe.',
  Product: 'Igicuruzwa',
  'Product Type / Kind': 'Ubwoko',
  'Quantity Sold': 'Ingano Yagurishijwe',
  Revenue: 'Amafaranga Yinjiye',
  Cost: 'Igiciro',
  Profit: 'Inyungu',
  'Sales Report': "Raporo y'Ibyagurishijwe",
  'sale recorded in this period.': 'yanditswe muri iki gihe.',
  'sales recorded in this period.': 'zanditswe muri iki gihe.',
  'No sales found': 'Nta byagurishijwe byabonetse',
  'No sales were recorded for the selected period.':
    'Nta byagurishijwe byanditswe mu gihe cyatoranyijwe.',
  Date: 'Itariki',
  Paid: 'Yishyuwe',
  Due: 'Asigaye',
  Status: 'Imiterere',
  'Payment Report': "Raporo y'Ubwishyu",
  'payment recorded in this period.': 'yakiriwe muri iki gihe.',
  'payments recorded in this period.': 'zakiriwe muri iki gihe.',
  'No payments found': 'Nta bwishyu bwabonetse',
  'No payments were recorded for the selected period.':
    'Nta bwishyu bwanditswe mu gihe cyatoranyijwe.',
  Amount: 'Amafaranga',
  Sale: 'Igurisha',
  Notes: 'Ibisobanuro',
  'Unknown Product': 'Igicuruzwa kitazwi',
  'Period:': 'Igihe:',
  'Generated:': 'Byakozwe:',
}

function translateReport(text: string, isRw: boolean): string {
  if (!isRw) return text
  return REPORT_TRANSLATIONS[text] || text
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getToday() {
  return getLocalDateString()
}

function getYesterday() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return getLocalDateString(date)
}

function getWeekStart() {
  const date = new Date()
  const day = date.getDay()

  const difference = day === 0 ? -6 : 1 - day

  date.setDate(date.getDate() + difference)

  return getLocalDateString(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-RW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStartOfDay(date: string) {
  return `${date}T00:00:00`
}

function getEndOfDay(date: string) {
  return `${date}T23:59:59.999`
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '')

  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n')
  ) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function getReportPeriodLabel(
  startDate: string,
  endDate: string,
  isRw: boolean
) {
  const today = getToday()
  const yesterday = getYesterday()
  const weekStart = getWeekStart()

  if (startDate === today && endDate === today) {
    return translateReport('Today', isRw)
  }

  if (startDate === yesterday && endDate === yesterday) {
    return translateReport('Yesterday', isRw)
  }

  if (startDate === weekStart && endDate === today) {
    return translateReport('This Week', isRw)
  }

  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}

export default function ReportsPage() {
  const { t } = useAppPreferences()
  const isRw = t('inventory').trim().toLowerCase() !== 'inventory'
  const tx = (text: string) => translateReport(text, isRw)

  const [sales, setSales] = useState<Sale[]>([])
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [batches, setBatches] = useState<Batch[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Default report = TODAY
  const [startDate, setStartDate] = useState(() => getToday())
  const [endDate, setEndDate] = useState(() => getToday())

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [
        salesResult,
        saleItemsResult,
        paymentsResult,
        productsResult,
        productTypesResult,
        batchesResult,
      ] = await Promise.all([
        supabase
          .from('sales')
          .select(
            `
              id,
              customer_id,
              sale_date,
              total_revenue,
              total_cost,
              total_profit,
              amount_paid,
              amount_due,
              payment_status
            `,
          )
          .order('sale_date', { ascending: false }),

        supabase
          .from('sale_items')
          .select(
            `
              id,
              sale_id,
              product_type_id,
              quantity,
              selling_price,
              revenue,
              cost,
              profit
            `,
          ),

        supabase
          .from('payments')
          .select(
            `
              id,
              sale_id,
              customer_id,
              amount,
              payment_date,
              notes
            `,
          )
          .order('payment_date', { ascending: false }),

        supabase.from('products').select('id, name').order('name'),

        supabase
          .from('product_types')
          .select('id, product_id, name, status')
          .order('name'),

        supabase
          .from('batches')
          .select(
            `
              id,
              product_type_id,
              remaining_quantity,
              unit_cost,
              status
            `,
          ),
      ])

      if (salesResult.error) throw salesResult.error
      if (saleItemsResult.error) throw saleItemsResult.error
      if (paymentsResult.error) throw paymentsResult.error
      if (productsResult.error) throw productsResult.error
      if (productTypesResult.error) throw productTypesResult.error
      if (batchesResult.error) throw batchesResult.error

      setSales((salesResult.data || []) as Sale[])
      setSaleItems((saleItemsResult.data || []) as SaleItem[])
      setPayments((paymentsResult.data || []) as Payment[])
      setProducts((productsResult.data || []) as Product[])
      setProductTypes((productTypesResult.data || []) as ProductType[])
      setBatches((batchesResult.data || []) as Batch[])
    } catch (err) {
      console.error('Reports load error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load reports.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredSales = useMemo(() => {
    if (!startDate || !endDate) return sales

    const start = new Date(getStartOfDay(startDate)).getTime()
    const end = new Date(getEndOfDay(endDate)).getTime()

    return sales.filter((sale) => {
      const saleTime = new Date(sale.sale_date).getTime()
      return saleTime >= start && saleTime <= end
    })
  }, [sales, startDate, endDate])

  const filteredSaleIds = useMemo(() => {
    return new Set(filteredSales.map((sale) => sale.id))
  }, [filteredSales])

  const filteredSaleItems = useMemo(() => {
    return saleItems.filter((item) => filteredSaleIds.has(item.sale_id))
  }, [saleItems, filteredSaleIds])

  const filteredPayments = useMemo(() => {
    if (!startDate || !endDate) return payments

    const start = new Date(getStartOfDay(startDate)).getTime()
    const end = new Date(getEndOfDay(endDate)).getTime()

    return payments.filter((payment) => {
      const paymentTime = new Date(payment.payment_date).getTime()
      return paymentTime >= start && paymentTime <= end
    })
  }, [payments, startDate, endDate])

  const totalRevenue = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) => sum + (Number(sale.total_revenue) || 0),
        0
      ),
    [filteredSales]
  )

  const totalCost = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) => sum + (Number(sale.total_cost) || 0),
        0
      ),
    [filteredSales]
  )

  const totalProfit = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) => sum + (Number(sale.total_profit) || 0),
        0
      ),
    [filteredSales]
  )

  const totalPaid = useMemo(
    () =>
      filteredPayments.reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0
      ),
    [filteredPayments]
  )

  const totalItemsSold = useMemo(
    () =>
      filteredSaleItems.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0
      ),
    [filteredSaleItems]
  )

  const outstandingDebt = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) => sum + Math.max(Number(sale.amount_due) || 0, 0),
        0
      ),
    [filteredSales]
  )

  const averageSale = useMemo(() => {
    if (filteredSales.length === 0) return 0
    return totalRevenue / filteredSales.length
  }, [totalRevenue, filteredSales.length])

  const profitMargin = useMemo(() => {
    if (totalRevenue <= 0) return 0
    return (totalProfit / totalRevenue) * 100
  }, [totalProfit, totalRevenue])

  const stockUnits = useMemo(
    () =>
      batches.reduce(
        (sum, batch) =>
          sum + Math.max(Number(batch.remaining_quantity) || 0, 0),
        0
      ),
    [batches]
  )

  const stockValue = useMemo(
    () =>
      batches.reduce((sum, batch) => {
        const quantity = Number(batch.remaining_quantity) || 0
        const unitCost = Number(batch.unit_cost) || 0
        return sum + quantity * unitCost
      }, 0),
    [batches]
  )

  const productTypeReports = useMemo<ProductTypeReport[]>(() => {
    const reportMap = new Map<string, ProductTypeReport>()

    for (const item of filteredSaleItems) {
      const productType = productTypes.find(
        (type) => type.id === item.product_type_id
      )
      if (!productType) continue

      const product = products.find(
        (itemProduct) => itemProduct.id === productType.product_id
      )

      const existing = reportMap.get(productType.id)

      if (existing) {
        existing.quantitySold += Number(item.quantity) || 0
        existing.revenue += Number(item.revenue) || 0
        existing.cost += Number(item.cost) || 0
        existing.profit += Number(item.profit) || 0
      } else {
        reportMap.set(productType.id, {
          productTypeId: productType.id,
          productName: product?.name || tx('Unknown Product'),
          productTypeName: productType.name,
          quantitySold: Number(item.quantity) || 0,
          revenue: Number(item.revenue) || 0,
          cost: Number(item.cost) || 0,
          profit: Number(item.profit) || 0,
        })
      }
    }

    return Array.from(reportMap.values()).sort((a, b) => b.profit - a.profit)
  }, [filteredSaleItems, productTypes, products, isRw])

  const paymentStatusSummary = useMemo(() => {
    const summary = { paid: 0, partial: 0, unpaid: 0 }

    for (const sale of filteredSales) {
      const status = sale.payment_status
      if (status === 'paid') {
        summary.paid += 1
      } else if (status === 'partial') {
        summary.partial += 1
      } else {
        summary.unpaid += 1
      }
    }

    return summary
  }, [filteredSales])

  function setToday() {
    const today = getToday()
    setStartDate(today)
    setEndDate(today)
  }

  function setYesterday() {
    const yesterday = getYesterday()
    setStartDate(yesterday)
    setEndDate(yesterday)
  }

  function setThisWeek() {
    setStartDate(getWeekStart())
    setEndDate(getToday())
  }

  function handlePrint() {
    window.print()
  }

  function handleExportCsv() {
    const rows: string[][] = []

    rows.push([tx('Kitchenware Management Report')])
    rows.push([`${tx('Period:')} ${startDate} to ${endDate}`])
    rows.push([])

    rows.push(['Summary', 'Value'])
    rows.push([tx('Total Revenue'), `${totalRevenue} RWF`])
    rows.push([tx('Total Cost'), `${totalCost} RWF`])
    rows.push([tx('Total Profit'), `${totalProfit} RWF`])
    rows.push([tx('profit margin'), `${profitMargin.toFixed(2)}%`])
    rows.push([tx('Payments Received'), `${totalPaid} RWF`])
    rows.push([tx('Outstanding Debt'), `${outstandingDebt} RWF`])
    rows.push([tx('Sales'), String(filteredSales.length)])
    rows.push([tx('Items Sold'), String(totalItemsSold)])
    rows.push([tx('Average Sale'), `${averageSale} RWF`])
    rows.push([tx('Units In Stock'), String(stockUnits)])
    rows.push([tx('Current Stock Value'), `${stockValue} RWF`])

    rows.push([])
    rows.push([tx('Product Type / Kind Performance')])
    rows.push([
      tx('Product'),
      tx('Product Type / Kind'),
      tx('Quantity Sold'),
      tx('Revenue'),
      tx('Cost'),
      tx('Profit'),
    ])

    for (const row of productTypeReports) {
      rows.push([
        row.productName,
        row.productTypeName,
        String(row.quantitySold),
        `${row.revenue} RWF`,
        `${row.cost} RWF`,
        `${row.profit} RWF`,
      ])
    }

    rows.push([])
    rows.push([tx('Sales Report')])
    rows.push([
      tx('Date'),
      'Sale ID',
      tx('Revenue'),
      tx('Cost'),
      tx('Profit'),
      tx('Paid'),
      tx('Due'),
      tx('Status'),
    ])

    for (const sale of filteredSales) {
      rows.push([
        formatDateTime(sale.sale_date),
        sale.id,
        String(Number(sale.total_revenue) || 0),
        String(Number(sale.total_cost) || 0),
        String(Number(sale.total_profit) || 0),
        String(Number(sale.amount_paid) || 0),
        String(Number(sale.amount_due) || 0),
        sale.payment_status,
      ])
    }

    rows.push([])
    rows.push([tx('Payment Report')])
    rows.push([tx('Date'), 'Payment ID', 'Sale ID', tx('Amount'), tx('Notes')])

    for (const payment of filteredPayments) {
      rows.push([
        formatDateTime(payment.payment_date),
        payment.id,
        payment.sale_id,
        String(Number(payment.amount) || 0),
        payment.notes || '',
      ])
    }

    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kitchenware-report-${startDate}-to-${endDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const periodLabel = getReportPeriodLabel(startDate, endDate, isRw)

  return (
    <>
      <main className="space-y-6 pb-8 print:space-y-4">
        {/* Hero Header */}
        <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-xl dark:border-gray-800 sm:p-8 print:hidden">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100 backdrop-blur">
                <ChartIcon className="h-4 w-4" />
                {tx('Business Intelligence')}
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {tx('Reports')}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                {tx(
                  "Understand today's sales, profit, payments, debts, and inventory at a glance."
                )}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {periodLabel}
                </span>

                <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  ● {tx('Live Data')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                <PrintIcon className="h-4 w-4" />
                {tx('Print')}
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400"
              >
                <DownloadIcon className="h-4 w-4" />
                {tx('Export CSV')}
              </button>
            </div>
          </div>
        </section>

        {/* Print Header */}
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">
            {tx('Kitchenware Management Report')}
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            {tx('Period:')} {startDate} to {endDate}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {tx('Generated:')} {new Date().toLocaleString()}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden">
            <AlertIcon className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold">{tx('Report could not be loaded')}</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Date Controls */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 print:hidden">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <CalendarIcon className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    {tx('Report Period')}
                  </h2>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tx('Choose the period you want to analyse.')}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <QuickDateButton
                  label={tx('Today')}
                  active={startDate === getToday() && endDate === getToday()}
                  onClick={setToday}
                />

                <QuickDateButton
                  label={tx('Yesterday')}
                  active={
                    startDate === getYesterday() && endDate === getYesterday()
                  }
                  onClick={setYesterday}
                />

                <QuickDateButton
                  label={tx('This Week')}
                  active={startDate === getWeekStart() && endDate === getToday()}
                  onClick={setThisWeek}
                />
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-2xl xl:grid-cols-3">
              <DateInput
                label={tx('Start Date')}
                value={startDate}
                max={endDate}
                onChange={setStartDate}
              />

              <DateInput
                label={tx('End Date')}
                value={endDate}
                min={startDate}
                onChange={setEndDate}
              />

              <button
                type="button"
                onClick={loadData}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 sm:col-span-2 xl:col-span-1"
              >
                <RefreshIcon className="h-4 w-4" />
                {tx('Refresh')}
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-400" />
              </div>

              <p className="mt-4 font-semibold text-gray-900 dark:text-white">
                {tx('Building your report...')}
              </p>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {tx('Loading sales, payments, and inventory.')}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Main KPIs */}
            <section>
              <SectionHeading
                icon={<MoneyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                title={tx('Financial Overview')}
                description={`${tx('Performance for')} ${periodLabel.toLowerCase()}.`}
              />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ReportCard
                  icon={<MoneyIcon />}
                  label={tx('Total Revenue')}
                  value={`${formatMoney(totalRevenue)} RWF`}
                  accent="indigo"
                />

                <ReportCard
                  icon={<BoxIcon />}
                  label={tx('Total Cost')}
                  value={`${formatMoney(totalCost)} RWF`}
                  accent="slate"
                />

                <ReportCard
                  icon={<ProfitIcon />}
                  label={tx('Total Profit')}
                  value={`${formatMoney(totalProfit)} RWF`}
                  valueClass="text-emerald-600 dark:text-emerald-400"
                  accent="emerald"
                  footer={`${profitMargin.toFixed(1)}% ${tx('profit margin')}`}
                />

                <ReportCard
                  icon={<DebtIcon />}
                  label={tx('Outstanding Debt')}
                  value={`${formatMoney(outstandingDebt)} RWF`}
                  valueClass="text-amber-600 dark:text-amber-400"
                  accent="amber"
                />
              </div>
            </section>

            {/* Activity KPIs */}
            <section>
              <SectionHeading
                icon={<ActivityIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                title={tx('Business Activity')}
                description={tx('Quick numbers for the selected period.')}
              />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ReportCard
                  icon={<ReceiptIcon />}
                  label={tx('Sales')}
                  value={String(filteredSales.length)}
                  accent="blue"
                />

                <ReportCard
                  icon={<BoxIcon />}
                  label={tx('Items Sold')}
                  value={String(totalItemsSold)}
                  accent="violet"
                />

                <ReportCard
                  icon={<WalletIcon />}
                  label={tx('Payments Received')}
                  value={`${formatMoney(totalPaid)} RWF`}
                  valueClass="text-indigo-600 dark:text-indigo-400"
                  accent="indigo"
                />

                <ReportCard
                  icon={<TargetIcon />}
                  label={tx('Average Sale')}
                  value={`${formatMoney(averageSale)} RWF`}
                  accent="cyan"
                />
              </div>
            </section>

            {/* Stock */}
            <section>
              <SectionHeading
                icon={<InventoryIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                title={tx('Current Stock')}
                description={tx(
                  'Current inventory based on remaining quantities and exact batch supply costs.'
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <ReportCard
                  icon={<BoxIcon />}
                  label={tx('Units In Stock')}
                  value={String(stockUnits)}
                  accent="blue"
                />

                <ReportCard
                  icon={<ValueIcon />}
                  label={tx('Current Stock Value')}
                  value={`${formatMoney(stockValue)} RWF`}
                  accent="violet"
                />
              </div>
            </section>

            {/* Payment Status */}
            <section>
              <SectionHeading
                icon={<WalletIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                title={tx('Payment Status')}
                description={tx('How sales in this period were paid.')}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <StatusCard
                  icon={<CheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
                  label={tx('Paid Sales')}
                  value={paymentStatusSummary.paid}
                  className="text-emerald-600 dark:text-emerald-400"
                  iconClass="bg-emerald-50 dark:bg-emerald-500/10"
                />

                <StatusCard
                  icon={<WarningIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
                  label={tx('Partial Sales')}
                  value={paymentStatusSummary.partial}
                  className="text-amber-600 dark:text-amber-400"
                  iconClass="bg-amber-50 dark:bg-amber-500/10"
                />

                <StatusCard
                  icon={<AlertIcon className="h-6 w-6 text-red-600 dark:text-red-400" />}
                  label={tx('Unpaid Sales')}
                  value={paymentStatusSummary.unpaid}
                  className="text-red-600 dark:text-red-400"
                  iconClass="bg-red-50 dark:bg-red-500/10"
                />
              </div>
            </section>

            {/* Product Performance */}
            <section>
              <SectionHeading
                icon={<TrophyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                title={tx('Product Type / Kind Performance')}
                description={tx(
                  'The strongest product types and kinds during the selected period.'
                )}
              />

              <ReportTable>
                {productTypeReports.length === 0 ? (
                  <EmptyState
                    icon={<ChartIcon className="h-8 w-8 text-gray-400" />}
                    title={tx('No product sales yet')}
                    description={tx(
                      'There are no product type sales for this period.'
                    )}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[950px] w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60">
                        <tr>
                          <TableHeader>{tx('Product')}</TableHeader>
                          <TableHeader>{tx('Product Type / Kind')}</TableHeader>
                          <TableHeader>{tx('Quantity Sold')}</TableHeader>
                          <TableHeader>{tx('Revenue')}</TableHeader>
                          <TableHeader>{tx('Cost')}</TableHeader>
                          <TableHeader>{tx('Profit')}</TableHeader>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {productTypeReports.map((row, index) => (
                          <tr
                            key={row.productTypeId}
                            className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                  {index === 0 ? (
                                    <TrophyIcon className="h-5 w-5 text-amber-500" />
                                  ) : (
                                    <BoxIcon className="h-5 w-5 text-slate-500" />
                                  )}
                                </span>

                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {row.productName}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 font-medium text-gray-700 dark:text-gray-300">
                              {row.productTypeName}
                            </td>

                            <td className="px-5 py-4 font-semibold">
                              {row.quantitySold}
                            </td>

                            <td className="px-5 py-4">
                              {formatMoney(row.revenue)} RWF
                            </td>

                            <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                              {formatMoney(row.cost)} RWF
                            </td>

                            <td className="px-5 py-4">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(row.profit)} RWF
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ReportTable>
            </section>

            {/* Sales Report */}
            <section>
              <SectionHeading
                icon={<ReceiptIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                title={tx('Sales Report')}
                description={`${filteredSales.length} ${
                  filteredSales.length === 1
                    ? tx('sale recorded in this period.')
                    : tx('sales recorded in this period.')
                }`}
              />

              <ReportTable>
                {filteredSales.length === 0 ? (
                  <EmptyState
                    icon={<ReceiptIcon className="h-8 w-8 text-gray-400" />}
                    title={tx('No sales found')}
                    description={tx(
                      'No sales were recorded for the selected period.'
                    )}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1050px] w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60">
                        <tr>
                          <TableHeader>{tx('Date')}</TableHeader>
                          <TableHeader>{tx('Revenue')}</TableHeader>
                          <TableHeader>{tx('Cost')}</TableHeader>
                          <TableHeader>{tx('Profit')}</TableHeader>
                          <TableHeader>{tx('Paid')}</TableHeader>
                          <TableHeader>{tx('Due')}</TableHeader>
                          <TableHeader>{tx('Status')}</TableHeader>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {filteredSales.map((sale) => (
                          <tr
                            key={sale.id}
                            className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                          >
                            <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                              {formatDateTime(sale.sale_date)}
                            </td>

                            <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                              {formatMoney(Number(sale.total_revenue) || 0)} RWF
                            </td>

                            <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                              {formatMoney(Number(sale.total_cost) || 0)} RWF
                            </td>

                            <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(Number(sale.total_profit) || 0)} RWF
                            </td>

                            <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                              {formatMoney(Number(sale.amount_paid) || 0)} RWF
                            </td>

                            <td className="px-5 py-4 font-bold text-amber-600 dark:text-amber-400">
                              {formatMoney(Number(sale.amount_due) || 0)} RWF
                            </td>

                            <td className="px-5 py-4">
                              <PaymentStatusBadge
                                status={sale.payment_status}
                                isRw={isRw}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ReportTable>
            </section>

            {/* Payment Report */}
            <section>
              <SectionHeading
                icon={<WalletIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                title={tx('Payment Report')}
                description={`${filteredPayments.length} ${
                  filteredPayments.length === 1
                    ? tx('payment recorded in this period.')
                    : tx('payments recorded in this period.')
                }`}
              />

              <ReportTable>
                {filteredPayments.length === 0 ? (
                  <EmptyState
                    icon={<WalletIcon className="h-8 w-8 text-gray-400" />}
                    title={tx('No payments found')}
                    description={tx(
                      'No payments were recorded for the selected period.'
                    )}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[800px] w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60">
                        <tr>
                          <TableHeader>{tx('Date')}</TableHeader>
                          <TableHeader>{tx('Amount')}</TableHeader>
                          <TableHeader>{tx('Sale')}</TableHeader>
                          <TableHeader>{tx('Notes')}</TableHeader>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {filteredPayments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                          >
                            <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                              {formatDateTime(payment.payment_date)}
                            </td>

                            <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(Number(payment.amount) || 0)} RWF
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                {payment.sale_id.slice(0, 8)}...
                              </span>
                            </td>

                            <td className="max-w-[300px] truncate px-5 py-4 text-gray-600 dark:text-gray-400">
                              {payment.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ReportTable>
            </section>
          </>
        )}
      </main>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          nav,
          aside,
          header {
            display: none !important;
          }

          * {
            box-shadow: none !important;
          }

          main {
            width: 100% !important;
            max-width: none !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          section {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  )
}

/* =========================================================
   COMPONENTS
========================================================= */

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
        {icon}
      </div>

      <div>
        <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h2>

        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  )
}

function ReportCard({
  icon,
  label,
  value,
  valueClass = 'text-gray-900 dark:text-white',
  accent = 'indigo',
  footer,
}: {
  icon: ReactNode
  label: string
  value: string
  valueClass?: string
  accent?: 'indigo' | 'slate' | 'emerald' | 'amber' | 'blue' | 'violet' | 'cyan'
  footer?: string
}) {
  const accentClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400',
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>

          <p className={`mt-2 break-words text-2xl font-black tracking-tight ${valueClass}`}>
            {value}
          </p>

          {footer && (
            <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              {footer}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105 ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusCard({
  icon,
  label,
  value,
  className,
  iconClass,
}: {
  icon: ReactNode
  label: string
  value: number
  className: string
  iconClass: string
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>

        <p className={`mt-1 text-3xl font-black ${className}`}>
          {value}
        </p>
      </div>

      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}
      >
        {icon}
      </div>
    </div>
  )
}

function QuickDateButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  )
}

function DateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </label>

      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[46px] w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
      />
    </div>
  )
}

function ReportTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {children}
    </div>
  )
}

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {children}
    </th>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  )
}

function PaymentStatusBadge({
  status,
  isRw,
}: {
  status: string
  isRw: boolean
}) {
  const normalized = status.toLowerCase()

  if (normalized === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <span>✓</span>
        {isRw ? 'Yishyuwe' : 'Paid'}
      </span>
    )
  }

  if (normalized === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <span>◐</span>
        {isRw ? 'Igice' : 'Partial'}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold capitalize text-red-700 dark:bg-red-500/10 dark:text-red-400">
      <span>!</span>
      {isRw ? 'Ntiyishyuwe' : status.replace(/_/g, ' ')}
    </span>
  )
}

/* =========================================================
   SVG ICONS
========================================================= */

function Icon({
  children,
  className = '',
}: {
  children: ReactNode
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

function MoneyIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h.01M17 15h.01" />
      <circle cx="12" cy="12" r="2.5" />
    </Icon>
  )
}

function ProfitIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-4 3 2 5-7" />
      <path d="M15 6h3v3" />
    </Icon>
  )
}

function WalletIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z" />
      <path d="M4 8h15" />
      <path d="M15 12h5" />
      <path d="M16.5 12v.01" />
    </Icon>
  )
}

function DebtIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M15 9.5c-.7-.8-1.7-1.2-3-1.2-1.7 0-2.8.8-2.8 2s1.1 1.8 2.8 2.1 2.8.6 2.8 2-1.1 2-2.8 2c-1.3 0-2.4-.5-3.1-1.3" />
    </Icon>
  )
}

function ReceiptIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
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

function InventoryIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 7h16v13H4z" />
      <path d="M7 7V4h10v3" />
      <path d="M8 11h8M8 15h5" />
    </Icon>
  )
}

function ValueIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v10" />
      <path d="M15 9.5c-.6-.8-1.6-1.2-3-1.2-1.6 0-2.7.7-2.7 1.9s1.1 1.7 2.7 2 2.7.6 2.7 1.9-1.1 1.9-2.7 1.9c-1.4 0-2.5-.4-3.1-1.2" />
    </Icon>
  )
}

function TargetIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </Icon>
  )
}

function TrophyIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
      <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
      <path d="M4 5h16v6a7 7 0 0 1-14 0V5z" />
      <path d="M12 16v3" />
      <path d="M8 21h8" />
    </Icon>
  )
}

function ActivityIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </Icon>
  )
}

function ChartIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 16v-4M12 16V8M17 16v-7" />
    </Icon>
  )
}

function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Icon>
  )
}

function PrintIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </Icon>
  )
}

function DownloadIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Icon>
  )
}

function WarningIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m12 3 9 17H3z" />
      <path d="M12 9v5M12 17v.01" />
    </Icon>
  )
}

function AlertIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16v.01" />
    </Icon>
  )
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </Icon>
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