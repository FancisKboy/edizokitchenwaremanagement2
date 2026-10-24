'use client'

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '@/lib/supabase'
import Modal from '@/components/modal'
import { useAppPreferences } from '@/app/providers'

type Customer = {
  id: string
  name: string
  phone: string | null
  active: boolean
}

type Sale = {
  id: string
  customer_id: string | null
  sale_date: string
  total_revenue: number
  amount_paid: number
  amount_due: number
  payment_status: string
  notes: string | null
}

type Payment = {
  id: string
  sale_id: string
  customer_id: string | null
  amount: number
  payment_date: string
  notes: string | null
  received_by: string | null
  created_at: string
}

type DebtRow = {
  customer: Customer
  salesCount: number
  totalRevenue: number
  totalPaid: number
  totalDue: number
}

/* -------------------------------------------------------------------------- */
/* TRANSLATIONS (English / Kinyarwanda)                                       */
/* -------------------------------------------------------------------------- */

const DEBTS_TRANSLATIONS: Record<string, string> = {
  'Customer Credit Control': "Gucunga Amadeni y'Abakiriya",
  Debts: 'Amadeni',
  'Track customer balances, record payments, and keep every payment history organized.':
    "Kurikirana amadeni y'abakiriya, kwandika ubwishyu, no kubika neza amateka y'ubwishyu bwose.",
  Outstanding: 'Amadeni Asigaye',
  'Something went wrong': 'Hari ibitagenze neza',
  Success: 'Byagenze neza',
  'Total Outstanding': 'Amadeni Yose Asigaye',
  'Money still owed': 'Amafaranga akiberewemo',
  'Customers With Debt': 'Abafite Amadeni',
  'Customers with balance': 'Abakiriya bafite amadeni',
  'Total Paid': 'Ayishyuwe Yose',
  'Collected payments': 'Amafaranga amaze kwakirwa',
  'Total Sales Value': "Agaciro k'Ibyagurishijwe Byose",
  'Sales across customers': 'Ibicuruzwa byose byagurishijwe',
  'Find Customers': 'Shakisha Abakiriya',
  'Search by customer name or phone number.':
    'Shakisha ku izina cyangwa nimero ya terefone.',
  'Search customers': 'Shakisha abakiriya',
  'Search name or phone...': 'Shakisha izina cyangwa terefone...',
  'Customer status': "Imiterere y'umukiriya",
  'All Customers': 'Abakiriya Bose',
  'Fully Paid': 'Bishyuwe Byose',
  'Customer Debt': "Amadeni y'Abakiriya",
  customer: 'umukiriya',
  customers: 'abakiriya',
  shown: 'yagaragajwe',
  'Outstanding accounts': 'Amakonti afite amadeni',
  'Paid accounts': 'Amakonti yishyuwe',
  'All accounts': 'Amakonti yose',
  'Loading debt information...': "Birimo gushakisha amakuru y'amadeni...",
  'No matching debt accounts': "Nta mukiriya uhuye n'ibyo ushakishije",
  'There are no customers matching the current search and filter.':
    "Nta bakiriya bahuye n'ibyo ushakishije cyangwa akayunguruzo.",
  'Reset Filters': 'Gusubiramo Akayunguruzo',
  Customer: 'Umukiriya',
  Sales: 'Ibyagurishijwe',
  'Total Sales': 'Amafaranga Yose',
  Paid: 'Ayishyuwe',
  Actions: 'Ibikorwa',
  'No phone number': 'Nta nimero ya terefone',
  History: 'Amateka',
  'Record Payment': 'Andika Ubwishyu',
  Cancel: 'Kureka',
  'Saving...': 'Birimo kubikwa...',
  'Selected Sale': 'Igurisha Ryatoranyijwe',
  'Sale Date': 'Itariki yo Kugurisha',
  'Sale Total': 'Yose Hamwe',
  'Payment Details': "Amakuru y'Ubwishyu",
  'Enter the amount received and payment information.':
    "Injiza amafaranga yakiriwe n'andi makuru y'ubwishyu.",
  'Payment Amount': 'Amafaranga Yishyuwe',
  Maximum: 'Ntarengwa',
  'Enter payment amount': 'Andika amafaranga yishyuwe',
  'Enter an amount up to the current outstanding balance.':
    'Injiza amafaranga atarenze asigaye ku ideni.',
  'Payment Date': "Itariki y'Ubwishyu",
  'Date & time': "Itariki n'isaha",
  Notes: 'Ibisobanuro',
  '(optional)': '(ubishatse)',
  'Extra information': "Amakuru y'inyongera",
  'Add an optional note about this payment...':
    "Andika ibisobanuro by'inyongera kuri ubu bwishyu...",
  'For example: cash received, bank transfer, or payment reference.':
    'Urugero: amafaranga mu ntoki, kuri banki, cyangwa Mobile Money.',
  'Payment to Record': 'Amafaranga agiye kwandikwa',
  'Payment History': "Amateka y'Ubwishyu",
  Close: 'Funga',
  Payments: 'Ubwishyu',
  'Sales & Outstanding Balances': "Ibyagurishijwe n'Amadeni Asigaye",
  'Every sale linked to this customer.':
    'Buri gurisha rifitanye isano nuyu mukiriya.',
  'No sales found for this customer.':
    'Nta bicuruzwa byagurishijwe kuri uyu mukiriya.',
  Date: 'Itariki',
  Due: 'Asigaye',
  Status: 'Imiterere',
  Action: 'Igikorwa',
  'Recorded payments and corrections.':
    'Ubwishyu bwanditswe hamwe nubwakosowe.',
  'No payments recorded for this customer.':
    'Nta bwishyu bwanditswe kuri uyu mukiriya.',
  Amount: 'Amafaranga',
  Type: 'Ubwoko',
  Correct: 'Kosora',
  'Initial Payment': 'Ubwishyu bwa Mbere',
  'Final Payment': 'Ubwishyu bwa Nyuma',
  'Installment Payment': 'Ubwishyu mu Byiciro',
  Payment: 'Ubwishyu',
  'Correct Payment': 'Gukosora Ubwishyu',
  'Correct the amount, date, or notes for this payment.':
    'Kosora amafaranga, itariki, cyangwa ibisobanuro byubu bwishyu.',
  'Original Amount': 'Amafaranga yari Yanditswe',
  'Corrected Amount': 'Amafaranga Mashya Yakosowe',
  'Save Correction': 'Bika Ibyakosowe',
  'Payment details to correct': "Amakuru y'ubwishyu agiye gukosorwa",
  'New amount matches original': "Amafaranga angana n'aya mbere",
  'Increase by': 'Kongeraho',
  'Decrease by': 'Kugabanyaho',
  Difference: 'Itandukaniro',
  'Enter corrected amount': 'Injiza amafaranga yakosowe',
  'Original Record': 'Inyandiko yambere',
  'New Value': 'Agaciro gashya',
  'Payment recorded successfully.': 'Ubwishyu bwanditswe neza.',
  'Payment corrected successfully.': 'Ubwishyu bwakosowe neza.',
  'Payment amount must be greater than zero.':
    'Amafaranga yishyurwa agomba kurenga zeru.',
  'Corrected amount must be greater than zero.':
    'Amafaranga yakosowe agomba kurenga zeru.',
  'Payment cannot exceed the outstanding debt of':
    'Amafaranga ntashobora kurenga ideni risigaye rya',
  'Payment for': 'Ubwishyu bwa',
  'Record a customer payment.': "Andika ubwishyu bw'umukiriya.",
  "'s sales and payments": " - Ibyagurishijwe n'Ubwishyu",
}

function translateDebts(text: string, isRw: boolean) {
  if (!isRw) return text
  return Object.prototype.hasOwnProperty.call(DEBTS_TRANSLATIONS, text)
    ? DEBTS_TRANSLATIONS[text]
    : text
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

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function getPaymentStatusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export default function DebtsPage() {
  const { t } = useAppPreferences()

  const isRw = t('inventory').trim().toLowerCase() !== 'inventory'
  const tx = (text: string) => translateDebts(text, isRw)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'debt' | 'paid'>('debt')

  const [recordOpen, setRecordOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [correctOpen, setCorrectOpen] = useState(false)

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const [correctedAmount, setCorrectedAmount] = useState('')
  const [correctedDate, setCorrectedDate] = useState('')
  const [correctedNotes, setCorrectedNotes] = useState('')

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [customersResult, salesResult, paymentsResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, phone, active')
          .order('name'),

        supabase
          .from('sales')
          .select(
            'id, customer_id, sale_date, total_revenue, amount_paid, amount_due, payment_status, notes',
          )
          .order('sale_date', {
            ascending: false,
          }),

        supabase
          .from('payments')
          .select(
            'id, sale_id, customer_id, amount, payment_date, notes, received_by, created_at',
          )
          .order('payment_date', {
            ascending: false,
          }),
      ])

      if (customersResult.error) throw customersResult.error
      if (salesResult.error) throw salesResult.error
      if (paymentsResult.error) throw paymentsResult.error

      setCustomers((customersResult.data || []) as Customer[])
      setSales((salesResult.data || []) as Sale[])
      setPayments((paymentsResult.data || []) as Payment[])
    } catch (err) {
      console.error('Debts load error:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load debt information.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setPaymentDate(new Date().toISOString().slice(0, 16))
  }, [])

  const debtRows = useMemo<DebtRow[]>(() => {
    return customers.map((customer) => {
      const customerSales = sales.filter(
        (sale) => sale.customer_id === customer.id,
      )

      const totalRevenue = customerSales.reduce(
        (sum, sale) => sum + (Number(sale.total_revenue) || 0),
        0,
      )

      const totalPaid = customerSales.reduce(
        (sum, sale) => sum + (Number(sale.amount_paid) || 0),
        0,
      )

      const totalDue = customerSales.reduce(
        (sum, sale) =>
          sum + Math.max(Number(sale.amount_due) || 0, 0),
        0,
      )

      return {
        customer,
        salesCount: customerSales.length,
        totalRevenue,
        totalPaid,
        totalDue,
      }
    })
  }, [customers, sales])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return debtRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.customer.name.toLowerCase().includes(query) ||
        row.customer.phone?.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'debt' && row.totalDue > 0) ||
        (statusFilter === 'paid' && row.totalDue <= 0)

      return matchesSearch && matchesStatus
    })
  }, [debtRows, search, statusFilter])

  const customersWithDebt = debtRows.filter((row) => row.totalDue > 0).length

  const totalDebt = debtRows.reduce((sum, row) => sum + row.totalDue, 0)
  const totalPaid = debtRows.reduce((sum, row) => sum + row.totalPaid, 0)
  const totalSalesValue = debtRows.reduce(
    (sum, row) => sum + row.totalRevenue,
    0,
  )

  const customerSales = selectedCustomer
    ? sales.filter((sale) => sale.customer_id === selectedCustomer.id)
    : []

  const customerDebtSales = customerSales.filter(
    (sale) => Number(sale.amount_due) > 0,
  )

  const selectedCustomerDebt = customerDebtSales.reduce(
    (sum, sale) => sum + (Number(sale.amount_due) || 0),
    0,
  )

  const correctingSale = useMemo(() => {
    if (!selectedPayment) return null
    return sales.find((s) => s.id === selectedPayment.sale_id) || null
  }, [selectedPayment, sales])

  const correctingCustomer = useMemo(() => {
    if (!selectedPayment) return null
    return (
      customers.find((c) => c.id === selectedPayment.customer_id) ||
      (correctingSale
        ? customers.find((c) => c.id === correctingSale.customer_id)
        : null) ||
      null
    )
  }, [selectedPayment, correctingSale, customers])

  /* ---------------- Modal Opening & Seamless Switching ---------------- */

  function openRecordPayment(customer: Customer, sale: Sale) {
    // Immediately close history modal to eliminate any overlay collision
    setHistoryOpen(false)

    setSelectedCustomer(customer)
    setSelectedSale(sale)

    setPaymentAmount(
      Number(sale.amount_due) > 0 ? String(sale.amount_due) : '',
    )
    setPaymentDate(new Date().toISOString().slice(0, 16))
    setPaymentNotes('')
    setError('')
    setSuccess('')
    setRecordOpen(true)
  }

  function closeRecordPayment() {
    if (saving) return
    setRecordOpen(false)
    setSelectedSale(null)
    setSelectedCustomer(null)
    setPaymentAmount('')
    setPaymentNotes('')
  }

  function openHistory(customer: Customer) {
    setSelectedCustomer(customer)
    setError('')
    setHistoryOpen(true)
  }

  function closeHistory() {
    setHistoryOpen(false)
    setSelectedCustomer(null)
  }

  function openCorrectPayment(payment: Payment) {
    // Immediately close history modal to prevent overlap
    setHistoryOpen(false)

    setSelectedPayment(payment)
    setCorrectedAmount(String(payment.amount))
    setCorrectedDate(
      new Date(payment.payment_date).toISOString().slice(0, 16),
    )
    setCorrectedNotes(payment.notes || '')
    setError('')
    setSuccess('')
    setCorrectOpen(true)
  }

  function closeCorrectPayment() {
    if (saving) return
    setCorrectOpen(false)
    setSelectedPayment(null)
    setCorrectedAmount('')
    setCorrectedDate('')
    setCorrectedNotes('')
  }

  /* ---------------- Form Submissions (Automatic Closing) ---------------- */

  async function handleRecordPayment(event: FormEvent) {
    event.preventDefault()
    if (!selectedSale) return

    const amount = Number(paymentAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(tx('Payment amount must be greater than zero.'))
      return
    }

    if (amount > Number(selectedSale.amount_due)) {
      setError(
        `${tx('Payment cannot exceed the outstanding debt of')} ${formatMoney(
          Number(selectedSale.amount_due),
        )} RWF.`,
      )
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const { error: rpcError } = await supabase.rpc(
        'record_sale_payment',
        {
          p_sale_id: selectedSale.id,
          p_amount: amount,
          p_payment_date: paymentDate
            ? new Date(paymentDate).toISOString()
            : new Date().toISOString(),
          p_notes: paymentNotes.trim() || null,
        },
      )

      if (rpcError) throw rpcError

      await loadData()
      setSuccess(tx('Payment recorded successfully.'))

      // Cleanly close ALL modals automatically
      setRecordOpen(false)
      setHistoryOpen(false)
      setSelectedSale(null)
      setSelectedCustomer(null)
      setPaymentAmount('')
      setPaymentNotes('')
    } catch (err) {
      console.error('Record payment error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to record payment.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleCorrectPayment(event: FormEvent) {
    event.preventDefault()
    if (!selectedPayment) return

    const amount = Number(correctedAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(tx('Corrected amount must be greater than zero.'))
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const { error: rpcError } = await supabase.rpc('correct_sale_payment', {
        p_payment_id: selectedPayment.id,
        p_new_amount: amount,
        p_payment_date: correctedDate
          ? new Date(correctedDate).toISOString()
          : null,
        p_notes: correctedNotes.trim() || null,
      })

      if (rpcError) throw rpcError

      await loadData()
      setSuccess(tx('Payment corrected successfully.'))

      // Cleanly close ALL modals automatically
      setCorrectOpen(false)
      setHistoryOpen(false)
      setSelectedPayment(null)
      setCorrectedAmount('')
      setCorrectedDate('')
      setCorrectedNotes('')
    } catch (err) {
      console.error('Correct payment error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to correct payment.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-xl dark:border-gray-800 sm:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 backdrop-blur">
              <Icon name="wallet" size={15} />
              {tx('Customer Credit Control')}
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {tx('Debts')}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {tx(
                'Track customer balances, record payments, and keep every payment history organized.',
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <Icon name="warning" size={21} />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                {tx('Outstanding')}
              </p>

              <p className="text-xl font-black text-white">
                {formatMoney(totalDebt)} RWF
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <div className="mt-0.5">
            <Icon name="warning" size={18} />
          </div>

          <div className="flex-1">
            <p className="font-semibold">{tx('Something went wrong')}</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div className="mt-0.5">
            <Icon name="check" size={18} />
          </div>

          <div>
            <p className="font-semibold">{tx('Success')}</p>
            <p className="mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={tx('Total Outstanding')}
          value={`${formatMoney(totalDebt)} RWF`}
          icon="warning"
          accent="amber"
          subtitle={tx('Money still owed')}
        />

        <SummaryCard
          label={tx('Customers With Debt')}
          value={String(customersWithDebt)}
          icon="users"
          accent="indigo"
          subtitle={tx('Customers with balance')}
        />

        <SummaryCard
          label={tx('Total Paid')}
          value={`${formatMoney(totalPaid)} RWF`}
          icon="check"
          accent="emerald"
          subtitle={tx('Collected payments')}
        />

        <SummaryCard
          label={tx('Total Sales Value')}
          value={`${formatMoney(totalSalesValue)} RWF`}
          icon="money"
          accent="blue"
          subtitle={tx('Sales across customers')}
        />
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {tx('Find Customers')}
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tx('Search by customer name or phone number.')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {tx('Search customers')}
            </label>

            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon name="search" size={17} />
              </div>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tx('Search name or phone...')}
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {tx('Customer status')}
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | 'debt' | 'paid')
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              <option value="debt">{tx('Customers With Debt')}</option>
              <option value="all">{tx('All Customers')}</option>
              <option value="paid">{tx('Fully Paid')}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Debt Table - Compact & Scrollable */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-4 py-3.5 dark:border-gray-800 sm:px-5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                <Icon name="users" size={16} />
              </div>

              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {tx('Customer Debt')}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredRows.length}{' '}
                  {filteredRows.length === 1 ? tx('customer') : tx('customers')}{' '}
                  {tx('shown')}
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              {statusFilter === 'debt'
                ? tx('Outstanding accounts')
                : statusFilter === 'paid'
                  ? tx('Paid accounts')
                  : tx('All accounts')}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-400" />
              </div>

              <p className="mt-3 text-xs font-medium text-gray-600 dark:text-gray-300">
                {tx('Loading debt information...')}
              </p>
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex min-h-[260px] items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <Icon name="check" size={24} />
              </div>

              <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                {tx('No matching debt accounts')}
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                {tx(
                  'There are no customers matching the current search and filter.',
                )}
              </p>

              {(search || statusFilter !== 'debt') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('debt')
                  }}
                  className="mt-3.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                >
                  {tx('Reset Filters')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="max-h-[460px] overflow-auto overscroll-contain">
            <table className="min-w-[950px] w-full text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 font-semibold uppercase tracking-wider text-gray-600 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">{tx('Customer')}</th>
                  <th className="px-4 py-3">{tx('Sales')}</th>
                  <th className="px-4 py-3">{tx('Total Sales')}</th>
                  <th className="px-4 py-3">{tx('Paid')}</th>
                  <th className="px-4 py-3">{tx('Outstanding')}</th>
                  <th className="px-4 py-3 text-right">{tx('Actions')}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {filteredRows.map((row) => (
                  <tr
                    key={row.customer.id}
                    className="group transition hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-black text-white shadow-xs">
                          {getInitials(row.customer.name)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-bold text-gray-900 dark:text-white">
                            {row.customer.name}
                          </p>

                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {row.customer.phone || tx('No phone number')}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-2.5">
                      <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {row.salesCount}
                      </span>
                    </td>

                    <td className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
                      {formatMoney(row.totalRevenue)} RWF
                    </td>

                    <td className="px-4 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(row.totalPaid)} RWF
                    </td>

                    <td className="px-4 py-2.5">
                      {row.totalDue > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          {formatMoney(row.totalDue)} RWF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <Icon name="check" size={11} />
                          {tx('Paid')}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openHistory(row.customer)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300"
                        >
                          <Icon name="history" size={13} />
                          {tx('History')}
                        </button>

                        {row.totalDue > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const firstDebtSale = sales.find(
                                (sale) =>
                                  sale.customer_id === row.customer.id &&
                                  Number(sale.amount_due) > 0,
                              )

                              if (firstDebtSale) {
                                openRecordPayment(row.customer, firstDebtSale)
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-700"
                          >
                            <Icon name="plus" size={13} />
                            {tx('Record Payment')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Record Payment Modal */}
      <Modal
        open={recordOpen}
        onClose={closeRecordPayment}
        title={tx('Record Payment')}
        description={
          selectedCustomer
            ? `${tx('Payment for')} ${selectedCustomer.name}`
            : tx('Record a customer payment.')
        }
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeRecordPayment}
              disabled={saving}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {tx('Cancel')}
            </button>

            <button
              type="submit"
              form="record-payment-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Spinner />
                  {tx('Saving...')}
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  {tx('Record Payment')}
                </>
              )}
            </button>
          </div>
        }
      >
        {selectedSale && (
          <form
            id="record-payment-form"
            onSubmit={handleRecordPayment}
            className="space-y-5"
          >
            {/* Selected Sale */}
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-emerald-50/40 p-5 dark:border-gray-800 dark:from-gray-800/70 dark:via-gray-900 dark:to-emerald-950/10">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Icon name="money" size={21} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {tx('Selected Sale')}
                  </p>

                  <p className="truncate font-bold text-gray-900 dark:text-white">
                    {selectedCustomer?.name}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <InfoBox
                  label={tx('Sale Date')}
                  value={formatDate(selectedSale.sale_date)}
                />

                <InfoBox
                  label={tx('Sale Total')}
                  value={`${formatMoney(
                    Number(selectedSale.total_revenue),
                  )} RWF`}
                />

                <InfoBox
                  label={tx('Outstanding')}
                  value={`${formatMoney(
                    Number(selectedSale.amount_due),
                  )} RWF`}
                  valueClass="text-amber-600 dark:text-amber-400"
                />
              </div>
            </div>

            {/* Payment Details */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">
                    {tx('Payment Details')}
                  </h3>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {tx('Enter the amount received and payment information.')}
                  </p>
                </div>

                <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 sm:flex">
                  <Icon name="check" size={17} />
                </div>
              </div>

              <div className="space-y-5">
                {/* Payment Amount */}
                <div>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {tx('Payment Amount')}
                    </label>

                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                      <Icon name="warning" size={12} />
                      {tx('Maximum')}:{' '}
                      {formatMoney(Number(selectedSale.amount_due))} RWF
                    </span>
                  </div>

                  <div className="group relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition group-focus-within:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:group-focus-within:bg-emerald-900/30">
                        <Icon name="money" size={16} />
                      </div>

                      <span className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
                    </div>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(event) =>
                        setPaymentAmount(event.target.value)
                      }
                      placeholder={tx('Enter payment amount')}
                      required
                      className="w-full rounded-2xl border border-gray-300 bg-gray-50 py-3.5 pl-16 pr-20 text-lg font-bold text-gray-900 outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-950"
                    />

                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-gray-500 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                      RWF
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {tx(
                      'Enter an amount up to the current outstanding balance.',
                    )}
                  </p>
                </div>

                {/* Payment Date */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {tx('Payment Date')}
                    </label>

                    <span className="text-xs text-gray-400">
                      {tx('Date & time')}
                    </span>
                  </div>

                  <div className="relative group">
                    <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-focus-within:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:group-focus-within:bg-indigo-900/30">
                        <Icon name="history" size={16} />
                      </div>
                    </div>

                    <input
                      type="datetime-local"
                      value={paymentDate}
                      onChange={(event) => setPaymentDate(event.target.value)}
                      required
                      className="w-full rounded-2xl border border-gray-300 bg-gray-50 py-3.5 pl-16 pr-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-950"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {tx('Notes')}
                      <span className="ml-1.5 font-normal text-gray-400">
                        {tx('(optional)')}
                      </span>
                    </label>

                    <span className="text-xs text-gray-400">
                      {tx('Extra information')}
                    </span>
                  </div>

                  <div className="relative group">
                    <div className="pointer-events-none absolute left-3 top-3.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition group-focus-within:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:group-focus-within:bg-gray-700">
                        <Icon name="info" size={16} />
                      </div>
                    </div>

                    <textarea
                      value={paymentNotes}
                      onChange={(event) =>
                        setPaymentNotes(event.target.value)
                      }
                      rows={4}
                      placeholder={tx(
                        'Add an optional note about this payment...',
                      )}
                      className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 py-3.5 pl-16 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:bg-white focus:ring-4 focus:ring-gray-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-950"
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {tx(
                      'For example: cash received, bank transfer, or payment reference.',
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Preview */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    {tx('Payment to Record')}
                  </p>

                  <p className="mt-1 text-lg font-black text-emerald-800 dark:text-emerald-200">
                    {formatMoney(Number(paymentAmount) || 0)} RWF
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm dark:bg-gray-900 dark:text-emerald-400">
                  <Icon name="check" size={20} />
                </div>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Payment History Modal */}
      <Modal
        open={historyOpen}
        onClose={closeHistory}
        title={tx('Payment History')}
        description={
          selectedCustomer
            ? `${selectedCustomer.name}${tx("'s sales and payments")}`
            : undefined
        }
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeHistory}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {tx('Close')}
            </button>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Customer hero */}
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gradient-to-r from-indigo-50 to-white p-4 dark:border-gray-800 dark:from-indigo-950/40 dark:to-gray-900">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow">
                {getInitials(selectedCustomer.name)}
              </div>

              <div className="min-w-0">
                <p className="text-base font-black text-gray-900 dark:text-white">
                  {selectedCustomer.name}
                </p>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {selectedCustomer.phone || tx('No phone number')}
                </p>
              </div>
            </div>

            {/* Customer summary */}
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniSummary
                label={tx('Total Sales')}
                value={String(customerSales.length)}
                icon="sales"
              />

              <MiniSummary
                label={tx('Outstanding')}
                value={`${formatMoney(selectedCustomerDebt)} RWF`}
                icon="warning"
                valueClass="text-amber-600 dark:text-amber-400"
              />

              <MiniSummary
                label={tx('Payments')}
                value={String(
                  payments.filter(
                    (payment) =>
                      payment.customer_id === selectedCustomer.id,
                  ).length,
                )}
                icon="money"
              />
            </div>

            {/* Sales / debt history - Compact & Scrollable */}
            <div>
              <div className="mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  {tx('Sales & Outstanding Balances')}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {tx('Every sale linked to this customer.')}
                </p>
              </div>

              {customerSales.length === 0 ? (
                <EmptySection text={tx('No sales found for this customer.')} />
              ) : (
                <div className="max-h-[240px] overflow-x-auto overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-[750px] w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                      <tr>
                        <th className="px-3.5 py-2.5">{tx('Date')}</th>
                        <th className="px-3.5 py-2.5">{tx('Sale Total')}</th>
                        <th className="px-3.5 py-2.5">{tx('Paid')}</th>
                        <th className="px-3.5 py-2.5">{tx('Due')}</th>
                        <th className="px-3.5 py-2.5">{tx('Status')}</th>
                        <th className="px-3.5 py-2.5 text-right">{tx('Action')}</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {customerSales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        >
                          <td className="px-3.5 py-2 text-gray-700 dark:text-gray-300">
                            {formatDate(sale.sale_date)}
                          </td>

                          <td className="px-3.5 py-2 font-semibold text-gray-900 dark:text-white">
                            {formatMoney(Number(sale.total_revenue))} RWF
                          </td>

                          <td className="px-3.5 py-2 font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(Number(sale.amount_paid))} RWF
                          </td>

                          <td className="px-3.5 py-2 font-bold text-amber-600 dark:text-amber-400">
                            {formatMoney(Number(sale.amount_due))} RWF
                          </td>

                          <td className="px-3.5 py-2">
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold capitalize text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {getPaymentStatusLabel(sale.payment_status)}
                            </span>
                          </td>

                          <td className="px-3.5 py-2 text-right">
                            {Number(sale.amount_due) > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  openRecordPayment(selectedCustomer, sale)
                                }
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-emerald-700"
                              >
                                {tx('Record Payment')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment history - Compact & Scrollable */}
            <div>
              <div className="mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  {tx('Payment History')}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {tx('Recorded payments and corrections.')}
                </p>
              </div>

              {payments.filter(
                (payment) => payment.customer_id === selectedCustomer.id,
              ).length === 0 ? (
                <EmptySection
                  text={tx('No payments recorded for this customer.')}
                />
              ) : (
                <div className="max-h-[220px] overflow-x-auto overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-[700px] w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                      <tr>
                        <th className="px-3.5 py-2.5">{tx('Date')}</th>
                        <th className="px-3.5 py-2.5">{tx('Amount')}</th>
                        <th className="px-3.5 py-2.5">{tx('Type')}</th>
                        <th className="px-3.5 py-2.5">{tx('Notes')}</th>
                        <th className="px-3.5 py-2.5 text-right">{tx('Action')}</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {payments
                        .filter(
                          (payment) =>
                            payment.customer_id === selectedCustomer.id,
                        )
                        .sort(
                          (a, b) =>
                            new Date(b.payment_date).getTime() -
                            new Date(a.payment_date).getTime(),
                        )
                        .map((payment) => (
                          <tr
                            key={payment.id}
                            className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                          >
                            <td className="px-3.5 py-2 text-gray-700 dark:text-gray-300">
                              {formatDateTime(payment.payment_date)}
                            </td>

                            <td className="px-3.5 py-2 font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(Number(payment.amount))} RWF
                            </td>

                            <td className="px-3.5 py-2">
                              <PaymentTypeBadge
                                payment={payment}
                                allPayments={payments.filter(
                                  (item) => item.sale_id === payment.sale_id,
                                )}
                                sale={sales.find(
                                  (sale) => sale.id === payment.sale_id,
                                )}
                                isRw={isRw}
                              />
                            </td>

                            <td className="max-w-[180px] truncate px-3.5 py-2 text-gray-500">
                              {payment.notes || '—'}
                            </td>

                            <td className="px-3.5 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => openCorrectPayment(payment)}
                                className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {tx('Correct')}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Correct Payment Modal */}
      <Modal
        open={correctOpen}
        onClose={closeCorrectPayment}
        title={tx('Correct Payment')}
        description={tx('Correct the amount, date, or notes for this payment.')}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeCorrectPayment}
              disabled={saving}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {tx('Cancel')}
            </button>

            <button
              type="submit"
              form="correct-payment-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Spinner />
                  {tx('Saving...')}
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  {tx('Save Correction')}
                </>
              )}
            </button>
          </div>
        }
      >
        <form
          id="correct-payment-form"
          onSubmit={handleCorrectPayment}
          className="space-y-5"
        >
          {selectedPayment && (
            <>
              {/* Context overview card */}
              <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white p-4 dark:border-blue-900/40 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm dark:bg-blue-500">
                      <Icon name="edit" size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {tx('Payment details to correct')}
                      </p>
                      <h4 className="truncate text-sm font-black text-gray-900 dark:text-white">
                        {correctingCustomer?.name || tx('Customer')}
                      </h4>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-white/80 px-3 py-1.5 backdrop-blur dark:border-blue-900/50 dark:bg-gray-800/80">
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      {tx('Original Record')}
                    </p>
                    <p className="text-xs font-black text-gray-900 dark:text-white">
                      {formatMoney(Number(selectedPayment.amount))} RWF
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-blue-200/60 pt-2.5 text-xs text-gray-600 dark:border-blue-900/40 dark:text-gray-300">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Icon name="history" size={13} className="text-blue-500" />
                    {formatDateTime(selectedPayment.payment_date)}
                  </span>
                  {selectedPayment.notes && (
                    <>
                      <span className="text-gray-300 dark:text-gray-700">•</span>
                      <span className="truncate italic opacity-85">
                        &ldquo;{selectedPayment.notes}&rdquo;
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Input container */}
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                {/* Corrected Amount Field */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-900 dark:text-white">
                      {tx('Corrected Amount')}
                    </label>

                    {Number(correctedAmount) > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          Number(correctedAmount) ===
                          Number(selectedPayment.amount)
                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            : Number(correctedAmount) >
                                Number(selectedPayment.amount)
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {Number(correctedAmount) ===
                        Number(selectedPayment.amount) ? (
                          tx('New amount matches original')
                        ) : Number(correctedAmount) >
                          Number(selectedPayment.amount) ? (
                          <>
                            {tx('Increase by')} +
                            {formatMoney(
                              Number(correctedAmount) -
                                Number(selectedPayment.amount),
                            )}{' '}
                            RWF
                          </>
                        ) : (
                          <>
                            {tx('Decrease by')} -
                            {formatMoney(
                              Number(selectedPayment.amount) -
                                Number(correctedAmount),
                            )}{' '}
                            RWF
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="group relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Icon name="money" size={14} />
                      </div>
                      <span className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
                    </div>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={correctedAmount}
                      onChange={(event) =>
                        setCorrectedAmount(event.target.value)
                      }
                      placeholder={tx('Enter corrected amount')}
                      required
                      className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-14 pr-16 text-base font-bold text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />

                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-white px-2 py-1 text-[11px] font-black text-gray-500 shadow-xs ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                      RWF
                    </div>
                  </div>
                </div>

                {/* Corrected Date Field */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    {tx('Payment Date')}
                  </label>

                  <div className="relative group">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Icon name="history" size={15} />
                    </div>

                    <input
                      type="datetime-local"
                      value={correctedDate}
                      onChange={(event) =>
                        setCorrectedDate(event.target.value)
                      }
                      required
                      className="w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 pl-9 pr-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </div>
                </div>

                {/* Notes Field */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    {tx('Notes')}{' '}
                    <span className="font-normal text-gray-400">
                      {tx('(optional)')}
                    </span>
                  </label>

                  <textarea
                    value={correctedNotes}
                    onChange={(event) =>
                      setCorrectedNotes(event.target.value)
                    }
                    rows={2}
                    placeholder={tx(
                      'Add an optional note about this payment...',
                    )}
                    className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 p-2.5 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>
    </main>
  )
}

/* -------------------------------------------------------------------------- */
/* UI Components                                                              */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  label,
  value,
  icon,
  accent,
  subtitle,
}: {
  label: string
  value: string
  icon: IconName
  accent: 'amber' | 'indigo' | 'emerald' | 'blue'
  subtitle: string
}) {
  const styles = {
    amber: {
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-900/40',
    },
    indigo: {
      icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-900/40',
    },
    emerald: {
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-900/40',
    },
    blue: {
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-900/40',
    },
  }

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 ${styles[accent].border}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles[accent].icon}`}
        >
          <Icon name={icon} size={21} />
        </div>
      </div>
    </div>
  )
}

function MiniSummary({
  label,
  value,
  icon,
  valueClass = 'text-gray-900 dark:text-white',
}: {
  label: string
  value: string
  icon: IconName
  valueClass?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={15} className="text-gray-400" />
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
      </div>

      <p className={`mt-2 text-xl font-black ${valueClass}`}>{value}</p>
    </div>
  )
}

function InfoBox({
  label,
  value,
  valueClass = 'text-gray-900 dark:text-white',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-sm font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 p-7 text-center dark:border-gray-700">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
        <Icon name="info" size={19} />
      </div>

      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  )
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  )
}

function PaymentTypeBadge({
  payment,
  allPayments,
  sale,
  isRw,
}: {
  payment: Payment
  allPayments: Payment[]
  sale?: Sale
  isRw: boolean
}) {
  const tx = (text: string) => translateDebts(text, isRw)

  if (payment.notes === 'Initial payment at sale creation') {
    return (
      <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
        {tx('Initial Payment')}
      </span>
    )
  }

  if (!sale) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {tx('Payment')}
      </span>
    )
  }

  const sorted = [...allPayments].sort((a, b) => {
    const dateDifference =
      new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()

    if (dateDifference !== 0) return dateDifference

    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  })

  let cumulative = 0

  for (const item of sorted) {
    cumulative += Number(item.amount) || 0

    if (item.id === payment.id) {
      const saleTotal = Number(sale.total_revenue) || 0

      if (saleTotal > 0 && cumulative >= saleTotal) {
        return (
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {tx('Final Payment')}
          </span>
        )
      }

      return (
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          {tx('Installment Payment')}
        </span>
      )
    }
  }

  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {tx('Payment')}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

type IconName =
  | 'wallet'
  | 'warning'
  | 'users'
  | 'check'
  | 'money'
  | 'search'
  | 'history'
  | 'plus'
  | 'sales'
  | 'edit'
  | 'info'

function Icon({
  name,
  size = 18,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }

  switch (name) {
    case 'wallet':
      return (
        <svg {...common}>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 16.5z" />
          <path d="M4 8h14.5A2.5 2.5 0 0 1 21 10.5V15h-5a2 2 0 0 1 0-4h5" />
          <path d="M16 13h.01" />
        </svg>
      )

    case 'warning':
      return (
        <svg {...common}>
          <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      )

    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )

    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      )

    case 'money':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v9" />
          <path d="M15 9.5c-.6-.8-1.5-1.2-2.9-1.2-1.7 0-2.8.7-2.8 1.8 0 1.2 1.2 1.7 2.8 1.9 1.8.2 2.8.8 2.8 2 0 1.1-1.1 1.8-2.8 1.8-1.4 0-2.5-.5-3.1-1.4" />
        </svg>
      )

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
      )

    case 'history':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      )

    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )

    case 'sales':
      return (
        <svg {...common}>
          <path d="M4 19V9" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M22 19H2" />
        </svg>
      )

    case 'edit':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      )

    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
      )

    default:
      return null
  }
}