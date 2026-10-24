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
  address: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

type Sale = {
  id: string
  customer_id: string | null
  total_revenue: number
  amount_paid: number
  amount_due: number
  payment_status: string
  sale_date: string
}

type CustomerRow = {
  customer: Customer
  salesCount: number
  totalPurchased: number
  totalPaid: number
  outstandingDebt: number
}

/* =========================================================
   TRANSLATIONS
========================================================= */

const CUSTOMER_TRANSLATIONS: Record<string, string> = {
  'Customer Management': 'Gucunga Abakiriya',
  Customers: 'Abakiriya',
  'Manage your customers, track their purchases, payments, and outstanding balances from one place.':
    "Gucunga abakiriya bawe, gukurikirana ibyo baguze, ubwishyu, n'amadeni bafite ahantu hamwe.",
  'total customers': 'abakiriya bose',
  active: 'bakora',
  'with outstanding debt': 'bafite amadeni',
  Refresh: 'Vugurura',
  'Add Customer': 'Ongeramo Umukiriya',
  'Total Customers': 'Abakiriya Bose',
  'All registered customers': 'Abakiriya bose banditse',
  'Active Customers': 'Abakiriya Bakora',
  'Currently available for sales': 'Bashobora kugurirwa ibicuruzwa',
  'Customer Sales': 'Ibyagurishijwe ku Bakiriya',
  'total revenue': 'amafaranga yose yinjiye',
  'Outstanding Debt': 'Amadeni Asigaye',
  'with balance': 'bafite amadeni',
  customer: 'umukiriya',
  customers: 'abakiriya',
  'Find Customers': 'Shakisha Abakiriya',
  'Search and filter your customer list.':
    "Shakisha kandi uyungurure urutonde rw'abakiriya.",
  'Clear filters': 'Siba ibyatoranyijwe',
  Search: 'Shakisha',
  'Search by name, phone, or address...':
    'Shakisha ku izina, telefoni, cyangwa aderesi...',
  Status: 'Imiterere',
  'All Customers': 'Abakiriya Bose',
  Active: 'Arakora',
  Inactive: 'Ntakora',
  'Customer List': "Urutonde rw'Abakiriya",
  Showing: 'Hagaragazwa',
  of: 'kuri',
  result: 'igisubizo',
  results: 'ibisubizo',
  'Loading customers...': 'Gupakurura abakiriya...',
  'Preparing customer data and balances.':
    "Gutegura amakuru y'abakiriya n'amadeni.",
  'No customers found': 'Nta mukiriya wabonetse',
  'Try changing your search or status filter, or add a new customer.':
    'Gerageza guhindura ibyo washakishije cyangwa wongeremo umukiriya mushya.',
  Customer: 'Umukiriya',
  Contact: 'Aho Abarizwa',
  Sales: 'Ibyaguzwe',
  Purchased: 'Yaguze',
  Paid: 'Yishyuwe',
  Outstanding: 'Asigaye',
  Actions: 'Ibikorwa',
  Added: 'Yiyandikishije',
  'No phone': 'Nta telefoni',
  'No address': 'Nta aderesi',
  Details: 'Ibirambuye',
  Edit: 'Hindura',
  Deactivate: 'Hagarika',
  Activate: 'Komeza',
  'Edit Customer': 'Vugurura Umukiriya',
  'Update this customer\'s information.':
    "Vugurura amakuru y'uyu mukiriya.",
  'Create a customer that can be used when recording sales.':
    'Shyiraho umukiriya ushobora gukoreshwa mu gihe cyo kugurisha.',
  'Customer Details': "Amakuru y'Umukiriya",
  Cancel: 'Reka',
  'Saving...': 'Birabikwa...',
  'Create Customer': 'Kora Umukiriya',
  'Update Customer': 'Vugurura Umukiriya',
  'Customer Name': "Izina ry'Umukiriya",
  Phone: 'Telefoni',
  Address: 'Aderesi',
  Notes: 'Ibisobanuro',
  'Customer since': 'Umukiriya kuva',
  'Total Purchased': 'Ibyaguzwe Byose',
  'Customer Information': "Amakuru y'Umukiriya",
  'Contact and account details': 'Aho abarizwa n’amakuru y’ubucuruzi',
  Name: 'Izina',
  Created: 'Yashyizweho',
  'Last Updated': 'Yavuguruwe',
  'No notes': 'Nta bisobanuro',
  'Sales History': "Amateka y'Ibyaguzwe",
  'Transactions associated with this customer.':
    "Ibikorwa by'igurisha bifitanye isano n'uyu mukiriya.",
  'No sales yet': 'Nta biragurishwa',
  'This customer has no recorded sales.':
    'Uyu mukiriya nta nyandiko z’igurisha aragira.',
  Date: 'Itariki',
  Revenue: 'Amafaranga Yinjiye',
  Due: 'Asigaye',
  Close: 'Funga',
  'Activate Customer': 'Komeza Umukiriya',
  'Deactivate Customer': 'Hagarika Umukiriya',
  'Are you sure you want to activate': 'Wizeye neza ko ushaka gukomeza',
  'Are you sure you want to deactivate': 'Wizeye neza ko ushaka guhagarika',
  'This customer will be available for recording sales.':
    'Uyu mukiriya azongera kuboneka mu gihe cyo kugurisha.',
  'This customer will not be available for new sales until activated again.':
    'Uyu mukiriya ntazongera kuboneka mu kugurisha kugeza yongeye gukomezwa.',
  'Activating...': 'Birakomezwa...',
  'Deactivating...': 'Birahagarikwa...',
}

function translateCustomer(text: string, isRw: boolean): string {
  if (!isRw) return text
  return CUSTOMER_TRANSLATIONS[text] || text
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
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getPaymentStatusClass(status: string) {
  const normalized = status.toLowerCase().replace(/_/g, ' ')
  if (normalized === 'paid') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  }
  if (normalized === 'partial') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name:
    | 'users'
    | 'user'
    | 'shopping'
    | 'money'
    | 'search'
    | 'plus'
    | 'refresh'
    | 'eye'
    | 'edit'
    | 'phone'
    | 'location'
    | 'calendar'
    | 'arrow'
    | 'close'
    | 'warning'
    | 'check'
  className?: string
}) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
  }

  switch (name) {
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      )
    case 'shopping':
      return (
        <svg {...common}>
          <path d="M6 8h12l1 13H5L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      )
    case 'money':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M7 9h.01M17 15h.01" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.9-4" />
          <path d="M4 4v5h5" />
          <path d="M4 13a8 8 0 0 0 14.9 4" />
          <path d="M20 20v-5h-5" />
        </svg>
      )
    case 'eye':
      return (
        <svg {...common}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      )
    case 'edit':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...common}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.08 5.18 2 2 0 0 1 5.05 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.62 2.61a2 2 0 0 1-.45 2.11L8.95 10.7a16 16 0 0 0 4.35 4.35l1.26-1.26a2 2 0 0 1 2.11-.45c.84.29 1.71.5 2.61.62A2 2 0 0 1 22 16.92Z" />
        </svg>
      )
    case 'location':
      return (
        <svg {...common}>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      )
    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      )
    case 'warning':
      return (
        <svg {...common}>
          <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
  }
}

export default function CustomersPage() {
  const { t } = useAppPreferences()
  const isRw = t('inventory').trim().toLowerCase() !== 'inventory'
  const tx = (text: string) => translateCustomer(text, isRw)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Custom Toggle Confirmation Modal state
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false)
  const [confirmToggleCustomer, setConfirmToggleCustomer] = useState<Customer | null>(null)

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [customersResult, salesResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, phone, address, notes, active, created_at, updated_at')
          .order('name'),
        supabase
          .from('sales')
          .select('id, customer_id, total_revenue, amount_paid, amount_due, payment_status, sale_date')
          .order('sale_date', { ascending: false }),
      ])

      if (customersResult.error) throw customersResult.error
      if (salesResult.error) throw salesResult.error

      setCustomers((customersResult.data || []) as Customer[])
      setSales((salesResult.data || []) as Sale[])
    } catch (err) {
      console.error('Customers load error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load customers.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const customerRows = useMemo<CustomerRow[]>(() => {
    return customers.map((customer) => {
      const customerSales = sales.filter((sale) => sale.customer_id === customer.id)
      const totalPurchased = customerSales.reduce(
        (total, sale) => total + (Number(sale.total_revenue) || 0),
        0
      )
      const totalPaid = customerSales.reduce(
        (total, sale) => total + (Number(sale.amount_paid) || 0),
        0
      )
      const outstandingDebt = customerSales.reduce(
        (total, sale) => total + Math.max(Number(sale.amount_due) || 0, 0),
        0
      )

      return {
        customer,
        salesCount: customerSales.length,
        totalPurchased,
        totalPaid,
        outstandingDebt,
      }
    })
  }, [customers, sales])

  const filteredRows = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return customerRows.filter((row) => {
      const customer = row.customer
      const matchesSearch =
        !searchValue ||
        customer.name.toLowerCase().includes(searchValue) ||
        customer.phone?.toLowerCase().includes(searchValue) ||
        customer.address?.toLowerCase().includes(searchValue)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && customer.active) ||
        (statusFilter === 'inactive' && !customer.active)

      return matchesSearch && matchesStatus
    })
  }, [customerRows, search, statusFilter])

  const totalCustomers = customers.length
  const activeCustomers = customers.filter((customer) => customer.active).length
  const totalCustomerSales = customerRows.reduce((total, row) => total + row.salesCount, 0)
  const totalOutstandingDebt = customerRows.reduce((total, row) => total + row.outstandingDebt, 0)
  const totalCustomerRevenue = customerRows.reduce((total, row) => total + row.totalPurchased, 0)
  const customersWithDebt = customerRows.filter((row) => row.outstandingDebt > 0).length

  function resetForm() {
    setName('')
    setPhone('')
    setAddress('')
    setNotes('')
  }

  function openCreateModal() {
    resetForm()
    setError('')
    setSuccess('')
    setCreateOpen(true)
  }

  function closeCreateModal() {
    if (saving) return
    setCreateOpen(false)
    resetForm()
  }

  function openEditModal(customer: Customer) {
    setSelectedCustomer(customer)
    setName(customer.name)
    setPhone(customer.phone || '')
    setAddress(customer.address || '')
    setNotes(customer.notes || '')
    setError('')
    setSuccess('')
    setEditOpen(true)
  }

  function closeEditModal() {
    if (saving) return
    setEditOpen(false)
    setSelectedCustomer(null)
    resetForm()
  }

  function openDetailsModal(customer: Customer) {
    setSelectedCustomer(customer)
    setError('')
    setDetailsOpen(true)
  }

  function closeDetailsModal() {
    setDetailsOpen(false)
    setSelectedCustomer(null)
  }

  // Opens the in-app confirmation modal
  function openToggleConfirm(customer: Customer) {
    setConfirmToggleCustomer(customer)
    setConfirmToggleOpen(true)
  }

  function closeToggleConfirm() {
    if (saving) return
    setConfirmToggleOpen(false)
    setConfirmToggleCustomer(null)
  }

  async function handleCreateCustomer(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError(isRw ? 'Izina ry’umukiriya rirakenewe.' : 'Customer name is required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const { error: insertError } = await supabase.from('customers').insert({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      })

      if (insertError) throw insertError

      await loadData()
      setSuccess(isRw ? 'Umukiriya yashyizweho neza.' : 'Customer created successfully.')
      setCreateOpen(false)
      resetForm()
    } catch (err) {
      console.error('Create customer error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create customer.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateCustomer(event: FormEvent) {
    event.preventDefault()
    if (!selectedCustomer) return
    if (!name.trim()) {
      setError(isRw ? 'Izina ry’umukiriya rirakenewe.' : 'Customer name is required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCustomer.id)

      if (updateError) throw updateError

      await loadData()
      setSuccess(isRw ? 'Umukiriya yavuguruwe neza.' : 'Customer updated successfully.')
      setEditOpen(false)
      setSelectedCustomer(null)
      resetForm()
    } catch (err) {
      console.error('Update customer error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update customer.')
    } finally {
      setSaving(false)
    }
  }

  // Executes the activation/deactivation from the popup modal
  async function executeToggleActive() {
    if (!confirmToggleCustomer) return

    const nextActive = !confirmToggleCustomer.active

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          active: nextActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', confirmToggleCustomer.id)

      if (updateError) throw updateError

      await loadData()
      setSuccess(
        nextActive
          ? isRw
            ? 'Umukiriya yemejwe neza.'
            : 'Customer activated successfully.'
          : isRw
          ? 'Umukiriya yahagaritswe neza.'
          : 'Customer deactivated successfully.'
      )
      setConfirmToggleOpen(false)
      setConfirmToggleCustomer(null)
    } catch (err) {
      console.error('Toggle customer status error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update customer status.')
    } finally {
      setSaving(false)
    }
  }

  const selectedCustomerRow = selectedCustomer
    ? customerRows.find((row) => row.customer.id === selectedCustomer.id) || null
    : null

  const selectedCustomerSales = selectedCustomer
    ? sales
        .filter((sale) => sale.customer_id === selectedCustomer.id)
        .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
    : []

  return (
    <main className="space-y-6 pb-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 shadow-xl dark:bg-slate-950">
        <div className="relative p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {tx('Customer Management')}
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {tx('Customers')}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                {tx(
                  'Manage your customers, track their purchases, payments, and outstanding balances from one place.'
                )}
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="rounded-full bg-white/5 px-3 py-1.5">
                  {totalCustomers} {tx('total customers')}
                </span>

                <span className="rounded-full bg-white/5 px-3 py-1.5">
                  {activeCustomers} {tx('active')}
                </span>

                <span className="rounded-full bg-white/5 px-3 py-1.5">
                  {customersWithDebt} {tx('with outstanding debt')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                <Icon
                  name="refresh"
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                {tx('Refresh')}
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
              >
                <Icon name="plus" className="h-4 w-4" />
                {tx('Add Customer')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 font-bold dark:bg-red-900/40">
            !
          </div>
          <div className="pt-1">{error}</div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 font-bold dark:bg-emerald-900/40">
            ✓
          </div>
          <div className="pt-1">{success}</div>
        </div>
      )}

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon="users"
          label={tx('Total Customers')}
          value={totalCustomers.toString()}
          description={tx('All registered customers')}
          iconClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
        />

        <SummaryCard
          icon="user"
          label={tx('Active Customers')}
          value={activeCustomers.toString()}
          description={tx('Currently available for sales')}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
        />

        <SummaryCard
          icon="shopping"
          label={tx('Customer Sales')}
          value={totalCustomerSales.toString()}
          description={`${formatMoney(totalCustomerRevenue)} RWF ${tx('total revenue')}`}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
        />

        <SummaryCard
          icon="money"
          label={tx('Outstanding Debt')}
          value={`${formatMoney(totalOutstandingDebt)} RWF`}
          description={`${customersWithDebt} ${
            customersWithDebt === 1 ? tx('customer') : tx('customers')
          } ${tx('with balance')}`}
          iconClass="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
          valueClass={
            totalOutstandingDebt > 0 ? 'text-amber-600 dark:text-amber-400' : undefined
          }
        />
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {tx('Find Customers')}
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {tx('Search and filter your customer list.')}
            </p>
          </div>

          {(search || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
              className="text-left text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {tx('Clear filters')}
            </button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {tx('Search')}
            </label>

            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tx('Search by name, phone, or address...')}
                className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {tx('Status')}
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              <option value="all">{tx('All Customers')}</option>
              <option value="active">{tx('Active')}</option>
              <option value="inactive">{tx('Inactive')}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Small & Scrollable Customer Table */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                <Icon name="users" className="h-4 w-4" />
              </div>

              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {tx('Customer List')}
              </h2>
            </div>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {tx('Showing')} {filteredRows.length} {tx('of')} {totalCustomers}{' '}
              {tx('customers')}
            </p>
          </div>

          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {filteredRows.length}{' '}
            {filteredRows.length === 1 ? tx('result') : tx('results')}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                <Icon
                  name="refresh"
                  className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400"
                />
              </div>

              <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {tx('Loading customers...')}
              </p>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {tx('Preparing customer data and balances.')}
              </p>
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <Icon name="user" className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-gray-900 dark:text-white">
                {tx('No customers found')}
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                {tx(
                  'Try changing your search or status filter, or add a new customer.'
                )}
              </p>

              {!search && statusFilter === 'all' && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  {tx('Add Customer')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
            <table className="min-w-[1100px] w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-3.5 py-3 font-bold">{tx('Customer')}</th>
                  <th className="px-3.5 py-3 font-bold">{tx('Contact')}</th>
                  <th className="px-3.5 py-3 font-bold">{tx('Sales')}</th>
                  <th className="px-3.5 py-3 font-bold">{tx('Purchased')}</th>
                  <th className="px-3.5 py-3 font-bold">{tx('Paid')}</th>
                  <th className="px-3.5 py-3 font-bold">{tx('Outstanding')}</th>
                  <th className="px-3.5 py-3 font-bold">{tx('Status')}</th>
                  <th className="px-3.5 py-3 text-right font-bold">{tx('Actions')}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRows.map((row) => {
                  const customer = row.customer

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => openDetailsModal(customer)}
                      className="cursor-pointer transition hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10"
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-xs font-bold text-white shadow-sm">
                            {getInitials(customer.name)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-gray-900 dark:text-white">
                              {customer.name}
                            </p>

                            <p className="text-[10px] text-gray-400">
                              {tx('Added')} {formatDate(customer.created_at)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                            <Icon
                              name="phone"
                              className="h-3 w-3 text-gray-400"
                            />
                            <span>{customer.phone || tx('No phone')}</span>
                          </div>

                          <div className="flex max-w-[200px] items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                            <Icon
                              name="location"
                              className="h-3 w-3 shrink-0"
                            />
                            <span className="truncate">
                              {customer.address || tx('No address')}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <span className="inline-flex min-w-7 items-center justify-center rounded-md bg-gray-100 px-2 py-0.5 font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          {row.salesCount}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 font-bold text-gray-900 dark:text-white">
                        {formatMoney(row.totalPurchased)}{' '}
                        <span className="text-[10px] font-medium text-gray-400">
                          RWF
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 font-medium text-gray-700 dark:text-gray-300">
                        {formatMoney(row.totalPaid)}{' '}
                        <span className="text-[10px] text-gray-400">RWF</span>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              row.outstandingDebt > 0
                                ? 'font-bold text-amber-600 dark:text-amber-400'
                                : 'font-semibold text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {formatMoney(row.outstandingDebt)}{' '}
                            <span className="text-[10px]">RWF</span>
                          </span>

                          {row.outstandingDebt > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          )}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <span
                          className={
                            customer.active
                              ? 'inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                          }
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              customer.active ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {customer.active ? tx('Active') : tx('Inactive')}
                        </span>
                      </td>

                      <td
                        className="px-3.5 py-2.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetailsModal(customer)}
                            title={tx('Details')}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
                          >
                            <Icon name="eye" className="h-3 w-3" />
                            {tx('Details')}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(customer)}
                            title={tx('Edit')}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            <Icon name="edit" className="h-3 w-3" />
                            {tx('Edit')}
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => openToggleConfirm(customer)}
                            className={
                              customer.active
                                ? 'rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-300'
                            }
                          >
                            {customer.active ? tx('Deactivate') : tx('Activate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Confirmation Modal for Activate / Deactivate */}
      <Modal
        open={confirmToggleOpen}
        onClose={closeToggleConfirm}
        title={
          confirmToggleCustomer?.active
            ? tx('Deactivate Customer')
            : tx('Activate Customer')
        }
        description={
          confirmToggleCustomer
            ? `${
                confirmToggleCustomer.active
                  ? tx('Are you sure you want to deactivate')
                  : tx('Are you sure you want to activate')
              } "${confirmToggleCustomer.name}"?`
            : undefined
        }
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeToggleConfirm}
              disabled={saving}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {tx('Cancel')}
            </button>

            <button
              type="button"
              onClick={executeToggleActive}
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                confirmToggleCustomer?.active
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {saving && <Icon name="refresh" className="h-4 w-4 animate-spin" />}
              {saving
                ? confirmToggleCustomer?.active
                  ? tx('Deactivating...')
                  : tx('Activating...')
                : confirmToggleCustomer?.active
                ? tx('Deactivate')
                : tx('Activate')}
            </button>
          </div>
        }
      >
        {confirmToggleCustomer && (
          <div className="space-y-4 py-1">
            <div
              className={`flex items-start gap-3 rounded-2xl p-4 ${
                confirmToggleCustomer.active
                  ? 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  confirmToggleCustomer.active
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                }`}
              >
                <Icon
                  name={confirmToggleCustomer.active ? 'warning' : 'check'}
                  className="h-5 w-5"
                />
              </div>

              <div className="min-w-0 flex-1 text-xs leading-5">
                <p className="font-bold">
                  {confirmToggleCustomer.active
                    ? tx('Deactivate Customer')
                    : tx('Activate Customer')}
                </p>
                <p className="mt-0.5 opacity-90">
                  {confirmToggleCustomer.active
                    ? tx(
                        'This customer will not be available for new sales until activated again.'
                      )
                    : tx(
                        'This customer will be available for recording sales.'
                      )}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Customer Modal */}
      <Modal
        open={createOpen}
        onClose={closeCreateModal}
        title={tx('Add Customer')}
        description={tx(
          'Create a customer that can be used when recording sales.'
        )}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeCreateModal}
              disabled={saving}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {tx('Cancel')}
            </button>

            <button
              type="submit"
              form="create-customer-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
              )}
              {saving ? tx('Saving...') : tx('Create Customer')}
            </button>
          </div>
        }
      >
        <form
          id="create-customer-form"
          onSubmit={handleCreateCustomer}
          className="space-y-4"
        >
          <CustomerFields
            name={name}
            phone={phone}
            address={address}
            notes={notes}
            setName={setName}
            setPhone={setPhone}
            setAddress={setAddress}
            setNotes={setNotes}
            tx={tx}
          />
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        open={editOpen}
        onClose={closeEditModal}
        title={tx('Edit Customer')}
        description={tx("Update this customer's information.")}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeEditModal}
              disabled={saving}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {tx('Cancel')}
            </button>

            <button
              type="submit"
              form="edit-customer-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
              )}
              {saving ? tx('Saving...') : tx('Update Customer')}
            </button>
          </div>
        }
      >
        <form
          id="edit-customer-form"
          onSubmit={handleUpdateCustomer}
          className="space-y-4"
        >
          <CustomerFields
            name={name}
            phone={phone}
            address={address}
            notes={notes}
            setName={setName}
            setPhone={setPhone}
            setAddress={setAddress}
            setNotes={setNotes}
            tx={tx}
          />
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        open={detailsOpen}
        onClose={closeDetailsModal}
        title={tx('Customer Details')}
        description={selectedCustomer ? selectedCustomer.name : undefined}
        footer={
          <div className="flex w-full justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (selectedCustomer) {
                  closeDetailsModal()
                  openEditModal(selectedCustomer)
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
            >
              <Icon name="edit" className="h-4 w-4" />
              {tx('Edit Customer')}
            </button>

            <button
              type="button"
              onClick={closeDetailsModal}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {tx('Close')}
            </button>
          </div>
        }
      >
        {selectedCustomer && selectedCustomerRow && (
          <div className="space-y-5">
            {/* Customer hero */}
            <div className="overflow-hidden rounded-2xl bg-slate-950 p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-xl font-bold shadow-lg">
                  {getInitials(selectedCustomer.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{selectedCustomer.name}</h3>

                    <span
                      className={
                        selectedCustomer.active
                          ? 'rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300'
                          : 'rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-300'
                      }
                    >
                      {selectedCustomer.active ? tx('Active') : tx('Inactive')}
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="calendar" className="h-3.5 w-3.5" />
                      {tx('Customer since')} {formatDate(selectedCustomer.created_at)}
                    </span>

                    {selectedCustomer.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="phone" className="h-3.5 w-3.5" />
                        {selectedCustomer.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer totals */}
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailStat
                label={tx('Sales')}
                value={selectedCustomerRow.salesCount.toString()}
                icon="shopping"
              />

              <DetailStat
                label={tx('Total Purchased')}
                value={`${formatMoney(selectedCustomerRow.totalPurchased)} RWF`}
                icon="money"
              />

              <DetailStat
                label={tx('Outstanding')}
                value={`${formatMoney(selectedCustomerRow.outstandingDebt)} RWF`}
                icon="money"
                valueClass={
                  selectedCustomerRow.outstandingDebt > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
              />
            </div>

            {/* Information */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/30">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-300">
                  <Icon name="user" className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                    {tx('Customer Information')}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {tx('Contact and account details')}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <InfoItem label={tx('Name')} value={selectedCustomer.name} />
                <InfoItem
                  label={tx('Phone')}
                  value={selectedCustomer.phone || tx('No phone')}
                />
                <InfoItem
                  label={tx('Address')}
                  value={selectedCustomer.address || tx('No address')}
                />
                <InfoItem
                  label={tx('Status')}
                  value={selectedCustomer.active ? tx('Active') : tx('Inactive')}
                />
                <InfoItem
                  label={tx('Created')}
                  value={formatDateTime(selectedCustomer.created_at)}
                />
                <InfoItem
                  label={tx('Last Updated')}
                  value={formatDateTime(selectedCustomer.updated_at)}
                />

                <div className="sm:col-span-2">
                  <InfoItem
                    label={tx('Notes')}
                    value={selectedCustomer.notes || tx('No notes')}
                  />
                </div>
              </div>
            </div>

            {/* Sales history */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                    {tx('Sales History')}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {tx('Transactions associated with this customer.')}
                  </p>
                </div>

                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {selectedCustomerSales.length}{' '}
                  {selectedCustomerSales.length === 1 ? tx('result') : tx('results')}
                </span>
              </div>

              {selectedCustomerSales.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
                    <Icon name="shopping" className="h-5 w-5" />
                  </div>
                  <p className="mt-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                    {tx('No sales yet')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                    {tx('This customer has no recorded sales.')}
                  </p>
                </div>
              ) : (
                <div className="max-h-[280px] overflow-x-auto overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-[650px] w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 shadow-sm dark:bg-gray-800/50 dark:text-gray-400">
                      <tr>
                        <th className="px-3.5 py-2.5 font-bold">{tx('Date')}</th>
                        <th className="px-3.5 py-2.5 font-bold">{tx('Revenue')}</th>
                        <th className="px-3.5 py-2.5 font-bold">{tx('Paid')}</th>
                        <th className="px-3.5 py-2.5 font-bold">{tx('Due')}</th>
                        <th className="px-3.5 py-2.5 font-bold">{tx('Status')}</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedCustomerSales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        >
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <Icon
                                name="calendar"
                                className="h-3.5 w-3.5 text-gray-400"
                              />
                              <span className="text-gray-700 dark:text-gray-300">
                                {formatDate(sale.sale_date)}
                              </span>
                            </div>
                          </td>

                          <td className="px-3.5 py-2.5 font-bold text-gray-900 dark:text-white">
                            {formatMoney(Number(sale.total_revenue) || 0)} RWF
                          </td>

                          <td className="px-3.5 py-2.5 text-gray-700 dark:text-gray-300">
                            {formatMoney(Number(sale.amount_paid) || 0)} RWF
                          </td>

                          <td className="px-3.5 py-2.5">
                            <span
                              className={
                                Number(sale.amount_due) > 0
                                  ? 'font-bold text-amber-600 dark:text-amber-400'
                                  : 'font-semibold text-emerald-600 dark:text-emerald-400'
                              }
                            >
                              {formatMoney(Number(sale.amount_due) || 0)} RWF
                            </span>
                          </td>

                          <td className="px-3.5 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${getPaymentStatusClass(
                                sale.payment_status
                              )}`}
                            >
                              {sale.payment_status.replace(/_/g, ' ')}
                            </span>
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
    </main>
  )
}

type SummaryCardProps = {
  icon: 'users' | 'user' | 'shopping' | 'money'
  label: string
  value: string
  description: string
  iconClass: string
  valueClass?: string
}

function SummaryCard({
  icon,
  label,
  value,
  description,
  iconClass,
  valueClass,
}: SummaryCardProps) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </div>

        <div className="h-7 w-7 rounded-full bg-gray-50 opacity-0 transition group-hover:opacity-100 dark:bg-gray-800">
          <div className="flex h-full items-center justify-center">
            <Icon name="arrow" className="h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${
          valueClass || 'text-gray-900 dark:text-white'
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  )
}

type DetailStatProps = {
  label: string
  value: string
  icon: 'shopping' | 'money'
  valueClass?: string
}

function DetailStat({ label, value, icon, valueClass }: DetailStatProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
          <Icon name={icon} className="h-3.5 w-3.5" />
        </div>

        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {label}
        </p>
      </div>

      <p
        className={`mt-2 text-base font-bold ${
          valueClass || 'text-gray-900 dark:text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-words font-medium text-gray-800 dark:text-gray-200">
        {value}
      </p>
    </div>
  )
}

type CustomerFieldsProps = {
  name: string
  phone: string
  address: string
  notes: string
  setName: (value: string) => void
  setPhone: (value: string) => void
  setAddress: (value: string) => void
  setNotes: (value: string) => void
  tx: (text: string) => string
}

function CustomerFields({
  name,
  phone,
  address,
  notes,
  setName,
  setPhone,
  setAddress,
  setNotes,
  tx,
}: CustomerFieldsProps) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
          {tx('Customer Name')}
        </label>

        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Jean Paul"
          required
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
          {tx('Phone')}
        </label>

        <input
          type="text"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="e.g. 078..."
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
          {tx('Address')}
        </label>

        <input
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Customer address"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
          {tx('Notes')}
        </label>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional notes..."
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
      </div>
    </>
  )
}