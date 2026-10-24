'use client'

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useAppPreferences } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/modal'

const PRODUCT_IMAGE_BUCKET = 'product-images'

type Customer = {
  id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  active: boolean
}

type Product = {
  id: string
  name: string
  status: 'active' | 'inactive'
}

type ProductType = {
  id: string
  product_id: string
  name: string
  description: string | null
  image_path: string | null
  minimum_stock: number
  status: 'active' | 'inactive'
}

type Sale = {
  id: string
  customer_id: string | null
  sale_date: string
  notes: string | null
  created_by: string
  total_revenue: number
  total_cost: number
  total_profit: number
  amount_paid: number
  amount_due: number
  payment_status: string
  created_at: string
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
  created_at: string
}

type Batch = {
  id: string
  purchase_item_id: string
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

type SaleBatchAllocation = {
  id: string
  sale_item_id: string
  batch_id: string
  quantity: number
  unit_cost: number
  total_cost: number | null
  created_at: string
}

type Payment = {
  id: string
  sale_id: string
  customer_id: string | null
  amount: number
  payment_date: string
  notes: string | null
  received_by: string
  created_at: string
}

type SaleDraftItem = {
  id: string
  product_id: string
  product_type_id: string
  productSearch: string
  typeSearch: string
  quantity: string
  selling_price: string
}

/* =========================================================
   TRANSLATIONS
========================================================= */

const SALES_TRANSLATIONS: Record<string, string> = {
  'Sales Management': 'Imicungire y’Ibyagurishijwe',
  Sales: 'Ibyagurishijwe',
  'Record sales, track exact FIFO costs, monitor profit, payments and customer balances.':
    'Andika ibyagurishijwe, ukurikirane ibiciro nyakuri bya FIFO, inyungu, ubwishyu n’amadeni y’abakiriya.',
  'Create Sale': 'Andika Igurisha',
  'Total Sales': 'Igiteranyo cy’Ibyagurishijwe',
  'Recorded transactions': 'Ibikorwa byanditswe',
  'Total Revenue': 'Amafaranga Yose Yinjiye',
  'Customer sales value': 'Agaciro k’ibyagurishijwe',
  'Total Profit': 'Inyungu Yose',
  'Profit after FIFO cost': 'Inyungu nyuma y’ikiguzi cya FIFO',
  'Amount Due': 'Amadeni Asigaye',
  'Outstanding customer balance': 'Umwenda usigaye ku bakiriya',
  'Sales History': 'Amateka y’Ibyagurishijwe',
  'All recorded sales and payment status.':
    'Ibyagurishijwe byose byanditswe n’imiterere y’ubwishyu.',
  sale: 'igurisha',
  sales: 'amagurisha',
  'Loading sales...': 'Gupakurura ibyagurishijwe...',
  'No sales yet': 'Nta byagurishijwe biraba',
  'Create your first sale to start tracking revenue, cost, profit and payments.':
    'Andika igurisha rya mbere kugira ngo utangire gukurikirana amafaranga yinjiye, ikiguzi, inyungu n’ubwishyu.',
  'Create First Sale': 'Andika Igurisha rya Mbere',
  Sale_TH: 'Igurisha',
  Customer: 'Umukiriya',
  'Sale Date': 'Itariki y’Igurisha',
  Revenue: 'Yinjiye',
  Cost: 'Ikiguzi',
  Profit: 'Inyungu',
  Paid: 'Yishyuwe',
  Due: 'Asigaye',
  Status: 'Imiterere',
  Action: 'Igikorwa',
  Payment: 'Ubwishyu',
  Details: 'Ibisobanuro',
  'Build the sale, choose the customer, and enter the selling prices.':
    'Tegura igurisha, uhitemo umukiriya kandi wandike ibiciro byo kugurisha.',
  'Choose who is buying these items.': 'Hitamo ugura ibi bicuruzwa.',
  'Add Customer': 'Ongeraho Umukiriya',
  'Select customer': 'Hitamo umukiriya',
  'No phone number': 'Nta telefoni',
  'Sale Items': 'Ibicuruzwa Byagurishijwe',
  'Search the product first, then choose its product type / kind.':
    'Banza ushake igicuruzwa, hanyuma uhitemo ubwoko bwacyo.',
  'Add Item': 'Ongeraho Igicuruzwa',
  'Sale Item': 'Igicuruzwa Cyagurishijwe',
  'Product → Type / Kind → Price': 'Igicuruzwa → Ubwoko → Igiciro',
  Remove: 'Kuraho',
  Product: 'Igicuruzwa',
  'Search to display products': 'Shakisha kugira ngo bigaragare',
  'Type a product name to search...': 'Andika izina ry’igicuruzwa ushaka...',
  'Selected Product': 'Igicuruzwa Cyatoranyijwe',
  Change: 'Hindura',
  'No products match': 'Nta bicuruzwa bihuye na',
  'Product Type / Kind': 'Ubwoko bw’Igicuruzwa',
  'Search to display types': 'Shakisha kugira ngo ubwoko bugaragare',
  'Type a product type / kind to search...':
    'Andika ubwoko bw’igicuruzwa ushaka...',
  'Select a product first...': 'Banza uhitemo igicuruzwa...',
  'Selected Type / Kind': 'Ubwoko Bwatoranyijwe',
  'Current stock:': 'Ibiri mu bubiko:',
  'Stock:': 'Ububiko:',
  'No product types match': 'Nta bwoko buhuye na',
  Quantity: 'Ingano',
  'Selling Price / Item': 'Igiciro cyo Kugurisha / Igice',
  'Item Revenue': 'Amafaranga y’Igicuruzwa',
  'Initial Payment': 'Ubwishyu bwa Mbere',
  'Pay the full sale now or record a partial payment.':
    'Ishyura igurisha ryose ubu cyangwa wandike ubwishyu bw’igice.',
  Notes: 'Ibisobanuro',
  '(optional)': '(si ngombwa)',
  'Optional sale notes...': 'Ibisobanuro ku igurisha (si ngombwa)...',
  'Sale Summary': 'Incamake y’Igurisha',
  'Review before saving.': 'Suzuma mbere yo kubika.',
  'Payment Status': 'Imiterere y’Ubwishyu',
  Cancel: 'Reka',
  'Creating Sale...': 'Turimo kwandika igurisha...',
  'Create a customer without leaving the sales screen.':
    'Ongeraho umukiriya utavuye kuri iyi paji.',
  'Customer Name': 'Izina ry’Umukiriya',
  'Enter customer name': 'Andika izina ry’umukiriya',
  Phone: 'Telefoni',
  'Optional phone number': 'Nimero ya telefoni (si ngombwa)',
  Address: 'Aderesi',
  'Optional address': 'Aderesi (si ngombwa)',
  'Optional customer notes': 'Ibisobanuro ku mukiriya (si ngombwa)',
  'Saving...': 'Birabikwa...',
  'Create Customer': 'Kora Umukiriya',
  'Sale Details': 'Ibisobanuro by’Igurisha',
  'Paid:': 'Yishyuwe:',
  '• Due:': '• Asigaye:',
  '+ Add Payment': '+ Ongeraho Ubwishyu',
  'Sold Items': 'Ibicuruzwa Byagurishijwe',
  'Actual FIFO cost and batch allocation.':
    'Ikiguzi nyakuri cya FIFO n’uko amatsinda yakoreshejwe.',
  'Selling Price': 'Igiciro cyo Kugurisha',
  'Actual FIFO Cost': 'Ikiguzi cya FIFO',
  'Batch Allocations': 'Amatsinda (Batches) Yakoreshejwe',
  'Batch:': 'Itsinda:',
  'No allocation found.': 'Nta tsinda ryabonetse.',
  Totals: 'Igiteranyo',
  'Payment History': 'Amateka y’Ubwishyu',
  'Every payment received for this sale.':
    'Ubwishyu bwose bwakiriwe kuri iri gurisha.',
  'No separate payment records found.': 'Nta bwishyu bwihariye bwabonetse.',
  'Payment Date': 'Itariki y’Ubwishyu',
  Amount: 'Amafaranga',
  'Payment ID': 'Nimero y’Ubwishyu',
  'Final Payment': 'Ubwishyu bwa Nyuma',
  'Installment Payment': 'Ubwishyu bw’Igice',
  Edit: 'Hindura',
  'Sale Notes': 'Ibisobanuro ku Igurisha',
  'Record Payment': 'Andika Ubwishyu',
  'Outstanding Balance': 'Umwenda Usigaye',
  'Current payment position': 'Uko ubwishyu bumeze ubu',
  'Sale Total': 'Igiteranyo cy’Igurisha',
  'Already Paid': 'Hamaze Kwishyurwa',
  'Remaining Due': 'Umwenda Usigaye',
  'Payment Amount': 'Amafaranga Yishyuwe',
  Max: 'Ntarenze',
  'Enter amount': 'Andika amafaranga',
  'Pay Full Due': 'Ishyura Umwenda Wose',
  'New remaining due:': 'Umwenda uzasigara:',
  'Optional payment note...': 'Ibisobanuro ku bwishyu (si ngombwa)...',
  'Recording...': 'Birandikwa...',
  'Edit Payment': 'Hindura Ubwishyu',
  'Correct the amount, date or notes for an existing payment.':
    'Kosora amafaranga, itariki cyangwa ibisobanuro by’ubwishyu.',
  'Payment Record': 'Inyandiko y’Ubwishyu',
  Initial: 'Bwa Mbere',
  Final: 'Bwa Nyuma',
  Installment: 'Igice',
  'Important correction': 'Ikosora ry’ingenzi',
  "Use this only when the payment was entered incorrectly. The sale's paid amount, remaining debt and payment status will be recalculated.":
    'Koresha ibi gusa igihe ubwishyu bwanditswe nabi. Amafaranga yishyuwe, umwenda usigaye n’imiterere y’ubwishyu bizongera kubarwa.',
  'Amount Correction': 'Ikosora ry’Amafaranga',
  Current: 'Ayari Asanzwe',
  Corrected: 'Yakosowe',
  'Corrected Payment Amount': 'Amafaranga y’Ubwishyu Yakosowe',
  'Payment Notes': 'Ibisobanuro ku Ubwishyu',
  'Payment note...': 'Ibisobanuro ku bwishyu...',
  'Saving Correction...': 'Turabika ibyakosowe...',
  'Save Correction': 'Bika Ibyakosowe',
  'Walk-in Customer': 'Umukiriya Usanzwe',
  'Unknown product': 'Igicuruzwa kitazwi',
  'Unknown customer': 'Umukiriya utazwi',
  'Unknown type': 'Ubwoko butazwi',
  Unknown: 'Ntizwi',
}

function translateSales(text: string, isRw: boolean): string {
  if (!isRw) return text
  return SALES_TRANSLATIONS[text] || text
}

function getPublicImageUrl(imagePath: string | null) {
  if (!imagePath) return null
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath)
    .data.publicUrl
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString()} RWF`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function makeDraftItem(): SaleDraftItem {
  return {
    id: crypto.randomUUID(),
    product_id: '',
    product_type_id: '',
    productSearch: '',
    typeSearch: '',
    quantity: '',
    selling_price: '',
  }
}

function getCurrentDateTimeLocal() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

function getDateTimeLocalFromDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return getCurrentDateTimeLocal()
  }
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

export default function SalesPage() {
  const { t } = useAppPreferences()
  const isRw = t('inventory').trim().toLowerCase() !== 'inventory'
  const tx = (text: string) => translateSales(text, isRw)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [allocations, setAllocations] = useState<SaleBatchAllocation[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [correctingPayment, setCorrectingPayment] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCorrectPaymentModal, setShowCorrectPaymentModal] = useState(false)

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [saleDate, setSaleDate] = useState('')
  const [notes, setNotes] = useState('')
  const [initialPayment, setInitialPayment] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const [correctPaymentAmount, setCorrectPaymentAmount] = useState('')
  const [correctPaymentDate, setCorrectPaymentDate] = useState('')
  const [correctPaymentNotes, setCorrectPaymentNotes] = useState('')

  const [draftItems, setDraftItems] = useState<SaleDraftItem[]>([makeDraftItem()])

  async function loadData() {
    setLoading(true)
    setError('')

    const [
      customersResult,
      productsResult,
      productTypesResult,
      salesResult,
      batchesResult,
    ] = await Promise.all([
      supabase
        .from('customers')
        .select('id,name,phone,address,notes,active')
        .eq('active', true)
        .order('name'),
      supabase
        .from('products')
        .select('id,name,status')
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('product_types')
        .select('id,product_id,name,description,image_path,minimum_stock,status')
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('sales')
        .select(
          'id,customer_id,sale_date,notes,created_by,total_revenue,total_cost,total_profit,amount_paid,amount_due,payment_status,created_at'
        )
        .order('sale_date', { ascending: false }),
      supabase
        .from('batches')
        .select(
          'id,purchase_item_id,product_type_id,batch_number,received_at,original_quantity,remaining_quantity,unit_cost,attachment_path,status,created_at'
        ),
    ])

    const firstError =
      customersResult.error ||
      productsResult.error ||
      productTypesResult.error ||
      salesResult.error ||
      batchesResult.error

    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    setCustomers(customersResult.data || [])
    setProducts(productsResult.data || [])
    setProductTypes(productTypesResult.data || [])
    setSales(salesResult.data || [])
    setBatches(batchesResult.data || [])
    setLoading(false)
  }

  useEffect(() => {
    setSaleDate(getCurrentDateTimeLocal())
    setPaymentDate(getCurrentDateTimeLocal())
    loadData()
  }, [])

  const walkInCustomer = useMemo(
    () =>
      customers.find(
        (c) => c.name.toLowerCase() === 'walk-in customer'
      ),
    [customers]
  )

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  )

  const draftTotal = useMemo(() => {
    return draftItems.reduce((total, item) => {
      const quantity = Number(item.quantity || 0)
      const price = Number(item.selling_price || 0)
      return total + quantity * price
    }, 0)
  }, [draftItems])

  const paymentNumber = Number(initialPayment || 0)
  const amountDue = Math.max(draftTotal - paymentNumber, 0)
  const paymentStatus =
    amountDue <= 0 ? 'paid' : paymentNumber > 0 ? 'partial' : 'unpaid'

  const totalSales = sales.length
  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.total_revenue || 0),
    0
  )
  const totalProfit = sales.reduce(
    (sum, sale) => sum + Number(sale.total_profit || 0),
    0
  )
  const totalDue = sales.reduce(
    (sum, sale) => sum + Number(sale.amount_due || 0),
    0
  )

  const selectedSaleDue = selectedSale ? Number(selectedSale.amount_due || 0) : 0
  const paymentNumberForModal = Number(paymentAmount || 0)
  const correctedAmountNumber = Number(correctPaymentAmount || 0)
  const correctionDifference = selectedPayment
    ? correctedAmountNumber - Number(selectedPayment.amount || 0)
    : 0

  function updateDraftItem(id: string, changes: Partial<SaleDraftItem>) {
    setDraftItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      )
    )
  }

  function removeDraftItem(id: string) {
    setDraftItems((current) => {
      if (current.length === 1) return current
      return current.filter((item) => item.id !== id)
    })
  }

  function addDraftItem() {
    setDraftItems((current) => [...current, makeDraftItem()])
  }

  function resetCreateForm() {
    setSelectedCustomerId(walkInCustomer?.id || '')
    setSaleDate(getCurrentDateTimeLocal())
    setNotes('')
    setInitialPayment('')
    setDraftItems([makeDraftItem()])
  }

  function openCreateModal() {
    setError('')
    setSuccess('')
    resetCreateForm()
    setShowCreateModal(true)
  }

  function openPaymentModal(sale: Sale) {
    setSelectedSale(sale)
    setPaymentAmount('')
    setPaymentDate(getCurrentDateTimeLocal())
    setPaymentNotes('')
    setError('')
    setSuccess('')
    setShowPaymentModal(true)
  }

  function openCorrectPaymentModal(payment: Payment) {
    setSelectedPayment(payment)
    setCorrectPaymentAmount(String(payment.amount))
    setCorrectPaymentDate(getDateTimeLocalFromDate(payment.payment_date))
    setCorrectPaymentNotes(payment.notes || '')
    setError('')
    setSuccess('')
    setShowCorrectPaymentModal(true)
  }

  async function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!customerName.trim()) {
      setError(isRw ? 'Izina ry’umukiriya rirakenewe.' : 'Customer name is required.')
      return
    }

    setSavingCustomer(true)
    setError('')
    setSuccess('')

    const { data, error: customerError } = await supabase
      .from('customers')
      .insert({
        name: customerName.trim(),
        phone: customerPhone.trim() || null,
        address: customerAddress.trim() || null,
        notes: customerNotes.trim() || null,
      })
      .select('id,name,phone,address,notes,active')
      .single()

    if (customerError) {
      setError(customerError.message)
      setSavingCustomer(false)
      return
    }

    if (data) {
      setCustomers((current) =>
        [...current, data].sort((a, b) => a.name.localeCompare(b.name))
      )
      setSelectedCustomerId(data.id)
    }

    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
    setCustomerNotes('')
    setShowCustomerModal(false)
    setSavingCustomer(false)
    setSuccess(isRw ? 'Umukiriya yanditswe neza.' : 'Customer created successfully.')
  }

  async function handleCreateSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedCustomerId) {
      setError(isRw ? 'Hitamo umukiriya.' : 'Please select a customer.')
      return
    }

    const validItems = draftItems.filter(
      (item) =>
        item.product_type_id &&
        Number(item.quantity) > 0 &&
        Number(item.selling_price) >= 0
    )

    if (validItems.length === 0) {
      setError(
        isRw
          ? 'Ongeraho nibura igicuruzwa kimwe cyemewe.'
          : 'Please add at least one valid sale item.'
      )
      return
    }

    if (paymentNumber < 0) {
      setError(
        isRw
          ? 'Ubwishyu bwa mbere ntibushobora kuba munsi ya zeru.'
          : 'Initial payment cannot be negative.'
      )
      return
    }

    if (paymentNumber > draftTotal) {
      setError(
        isRw
          ? 'Ubwishyu bwa mbere ntibushobora kurenga igiteranyo cy’igurisha.'
          : 'Initial payment cannot exceed the sale total.'
      )
      return
    }

    setSaving(true)

    const items = validItems.map((item) => ({
      product_type_id: item.product_type_id,
      quantity: Number(item.quantity),
      selling_price: Number(item.selling_price),
    }))

    const { data, error: saleError } = await supabase.rpc('create_sale', {
      p_customer_id: selectedCustomerId || null,
      p_sale_date: new Date(saleDate).toISOString(),
      p_notes: notes.trim() || null,
      p_items: items,
      p_initial_payment: paymentNumber,
    })

    if (saleError) {
      setError(saleError.message)
      setSaving(false)
      return
    }

    setShowCreateModal(false)
    setSaving(false)
    resetCreateForm()
    await loadData()

    setSuccess(
      isRw
        ? `Igurisha ryanditswe neza. Nimero y’igurisha: ${data}`
        : `Sale created successfully. Sale ID: ${data}`
    )
  }

  async function viewSaleDetails(sale: Sale) {
    setSelectedSale(sale)
    setError('')
    setSuccess('')

    const [saleItemsResult, allocationsResult, paymentsResult] =
      await Promise.all([
        supabase
          .from('sale_items')
          .select(
            'id,sale_id,product_type_id,quantity,selling_price,revenue,cost,profit,created_at'
          )
          .eq('sale_id', sale.id)
          .order('created_at'),
        supabase
          .from('sale_batch_allocations')
          .select('id,sale_item_id,batch_id,quantity,unit_cost,total_cost,created_at')
          .order('created_at'),
        supabase
          .from('payments')
          .select(
            'id,sale_id,customer_id,amount,payment_date,notes,received_by,created_at'
          )
          .eq('sale_id', sale.id)
          .order('payment_date', { ascending: false }),
      ])

    const detailsError =
      saleItemsResult.error || allocationsResult.error || paymentsResult.error
    if (detailsError) {
      setError(detailsError.message)
      return
    }

    setSaleItems(saleItemsResult.data || [])
    setAllocations(allocationsResult.data || [])
    setPayments(paymentsResult.data || [])
    setShowDetailsModal(true)
  }

  async function refreshSelectedSale(saleId: string) {
    const { data, error: saleError } = await supabase
      .from('sales')
      .select(
        'id,customer_id,sale_date,notes,created_by,total_revenue,total_cost,total_profit,amount_paid,amount_due,payment_status,created_at'
      )
      .eq('id', saleId)
      .single()

    if (saleError) throw saleError
    if (!data) return

    setSelectedSale(data)
    setSales((current) =>
      current.map((sale) => (sale.id === data.id ? data : sale))
    )

    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select(
        'id,sale_id,customer_id,amount,payment_date,notes,received_by,created_at'
      )
      .eq('sale_id', saleId)
      .order('payment_date', { ascending: false })

    if (paymentError) throw paymentError
    setPayments(paymentData || [])
  }

  async function handleRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSale) {
      setError(isRw ? 'Nta gurisha ryatoranyijwe.' : 'No sale selected.')
      return
    }

    const amount = Number(paymentAmount || 0)
    if (!amount || amount <= 0) {
      setError(
        isRw
          ? 'Amafaranga yishyuwe agomba kuba arenze zeru.'
          : 'Payment amount must be greater than zero.'
      )
      return
    }

    if (amount > selectedSaleDue) {
      setError(
        isRw
          ? `Amafaranga ntashobora kurenga umwenda usigaye wa ${formatMoney(selectedSaleDue)}.`
          : `Payment cannot exceed the remaining due of ${formatMoney(selectedSaleDue)}.`
      )
      return
    }

    setSavingPayment(true)
    setError('')
    setSuccess('')

    const { error: paymentError } = await supabase.rpc('record_sale_payment', {
      p_sale_id: selectedSale.id,
      p_amount: amount,
      p_payment_date: new Date(paymentDate).toISOString(),
      p_notes: paymentNotes.trim() || null,
    })

    if (paymentError) {
      setError(paymentError.message)
      setSavingPayment(false)
      return
    }

    try {
      await refreshSelectedSale(selectedSale.id)
      await loadData()
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Payment was recorded, but page could not refresh.'
      )
      setSavingPayment(false)
      return
    }

    setPaymentAmount('')
    setPaymentDate(getCurrentDateTimeLocal())
    setPaymentNotes('')
    setShowPaymentModal(false)
    setSavingPayment(false)
    setSuccess(
      isRw
        ? `Ubwishyu bwa ${formatMoney(amount)} bwanditswe neza.`
        : `Payment of ${formatMoney(amount)} recorded successfully.`
    )
  }

  async function handleCorrectPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedPayment) {
      setError(isRw ? 'Nta bwishyu bwatoranyijwe.' : 'No payment selected.')
      return
    }

    const newAmount = Number(correctPaymentAmount || 0)
    if (!newAmount || newAmount <= 0) {
      setError(
        isRw
          ? 'Amafaranga y’ubwishyu yakosowe agomba kuba arenze zeru.'
          : 'Corrected payment amount must be greater than zero.'
      )
      return
    }

    if (!correctPaymentDate) {
      setError(isRw ? 'Itariki y’ubwishyu irakenewe.' : 'Payment date is required.')
      return
    }

    setCorrectingPayment(true)
    setError('')
    setSuccess('')

    const { error: correctionError } = await supabase.rpc(
      'correct_sale_payment',
      {
        p_payment_id: selectedPayment.id,
        p_new_amount: newAmount,
        p_payment_date: new Date(correctPaymentDate).toISOString(),
        p_notes: correctPaymentNotes.trim() || null,
      }
    )

    if (correctionError) {
      setError(correctionError.message)
      setCorrectingPayment(false)
      return
    }

    try {
      await refreshSelectedSale(selectedPayment.sale_id)
      await loadData()
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Payment was corrected, but page could not refresh.'
      )
      setCorrectingPayment(false)
      return
    }

    setShowCorrectPaymentModal(false)
    setSelectedPayment(null)
    setCorrectPaymentAmount('')
    setCorrectPaymentDate('')
    setCorrectPaymentNotes('')
    setCorrectingPayment(false)
    setSuccess(
      isRw
        ? `Ubwishyu bwakosowe neza, ubu ni ${formatMoney(newAmount)}.`
        : `Payment corrected successfully to ${formatMoney(newAmount)}.`
    )
  }

  function getProductName(productId: string) {
    return (
      products.find((p) => p.id === productId)?.name || tx('Unknown product')
    )
  }

  function getProductType(productTypeId: string) {
    return productTypes.find((t) => t.id === productTypeId)
  }

  function getBatch(batchId: string) {
    return batches.find((b) => b.id === batchId)
  }

  function getItemAllocations(saleItemId: string) {
    return allocations.filter((a) => a.sale_item_id === saleItemId)
  }

  function getCustomerName(customerId: string | null) {
    if (!customerId) return tx('Walk-in Customer')
    return (
      customers.find((c) => c.id === customerId)?.name || tx('Unknown customer')
    )
  }

  function getPaymentType(
    payment: Payment,
    allPayments: Payment[],
    saleTotal: number
  ) {
    if (payment.notes === 'Initial payment at sale creation') {
      return 'initial'
    }

    const chronological = [...allPayments].sort((a, b) => {
      const diff =
        new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
      if (diff !== 0) return diff
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    let running = 0
    for (const p of chronological) {
      running += Number(p.amount || 0)
      if (p.id === payment.id && running >= saleTotal) {
        return 'final'
      }
    }

    return 'installment'
  }

  return (
    <main className="min-h-full space-y-6 bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-xl dark:border-slate-800 sm:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 backdrop-blur">
                <Icon name="sales" className="h-4 w-4" />
                {tx('Sales Management')}
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {tx('Sales')}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {tx(
                  'Record sales, track exact FIFO costs, monitor profit, payments and customer balances.'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              <Icon name="plus" className="h-4 w-4" />
              {tx('Create Sale')}
            </button>
          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <Icon name="warning" className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Icon name="check" className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">{success}</p>
            </div>
          </div>
        )}

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label={tx('Total Sales')}
            value={totalSales.toLocaleString()}
            subtitle={tx('Recorded transactions')}
            accent="indigo"
            icon="sales"
          />

          <SummaryCard
            label={tx('Total Revenue')}
            value={formatMoney(totalRevenue)}
            subtitle={tx('Customer sales value')}
            accent="blue"
            icon="money"
          />

          <SummaryCard
            label={tx('Total Profit')}
            value={formatMoney(totalProfit)}
            subtitle={tx('Profit after FIFO cost')}
            accent="emerald"
            icon="profit"
          />

          <SummaryCard
            label={tx('Amount Due')}
            value={formatMoney(totalDue)}
            subtitle={tx('Outstanding customer balance')}
            accent="amber"
            icon="warning"
          />
        </div>

        {/* Small & Scrollable Sales History */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <Icon name="sales" className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-base font-black">
                      {tx('Sales History')}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tx('All recorded sales and payment status.')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {sales.length} {sales.length === 1 ? tx('sale') : tx('sales')}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center p-8">
              <div className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-400" />
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {tx('Loading sales...')}
                </p>
              </div>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                  <Icon name="sales" className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-black">
                  {tx('No sales yet')}
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {tx(
                    'Create your first sale to start tracking revenue, cost, profit and payments.'
                  )}
                </p>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-3 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
                >
                  {tx('Create First Sale')}
                </button>
              </div>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
              <table className="min-w-[1050px] w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-3.5 py-3 font-bold">{tx('Sale_TH')}</th>
                    <th className="px-3.5 py-3 font-bold">{tx('Customer')}</th>
                    <th className="px-3.5 py-3 font-bold">{tx('Sale Date')}</th>
                    <th className="px-3.5 py-3 text-right font-bold">{tx('Revenue')}</th>
                    <th className="px-3.5 py-3 text-right font-bold">{tx('Cost')}</th>
                    <th className="px-3.5 py-3 text-right font-bold">{tx('Profit')}</th>
                    <th className="px-3.5 py-3 text-right font-bold">{tx('Paid')}</th>
                    <th className="px-3.5 py-3 text-right font-bold">{tx('Due')}</th>
                    <th className="px-3.5 py-3 font-bold">{tx('Status')}</th>
                    <th className="px-3.5 py-3 text-right font-bold">{tx('Action')}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="group transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-3.5 py-2.5 font-bold">
                        #{sale.id.slice(0, 8)}
                      </td>

                      <td className="px-3.5 py-2.5 font-semibold">
                        {getCustomerName(sale.customer_id)}
                      </td>

                      <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                        {formatDate(sale.sale_date)}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-bold">
                        {formatMoney(sale.total_revenue)}
                      </td>

                      <td className="px-3.5 py-2.5 text-right text-slate-600 dark:text-slate-300">
                        {formatMoney(sale.total_cost)}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(sale.total_profit)}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-medium">
                        {formatMoney(sale.amount_paid)}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                        {formatMoney(sale.amount_due)}
                      </td>

                      <td className="px-3.5 py-2.5">
                        <PaymentStatusBadge status={sale.payment_status} isRw={isRw} />
                      </td>

                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          {Number(sale.amount_due) > 0 && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(sale)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-emerald-700"
                            >
                              <Icon name="plus" className="h-3 w-3" />
                              {tx('Payment')}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => viewSaleDetails(sale)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Icon name="eye" className="h-3 w-3" />
                            {tx('Details')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Create Sale Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          if (!saving) setShowCreateModal(false)
        }}
        title={tx('Create Sale')}
        description={tx(
          'Build the sale, choose the customer, and enter the selling prices.'
        )}
        size="xl"
      >
        <form onSubmit={handleCreateSale} className="space-y-5">
          {/* Customer */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {tx('Customer')}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setShowCustomerModal(true)
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/50 dark:bg-slate-900 dark:text-indigo-300"
              >
                <Icon name="plus" className="h-3 w-3" />
                {tx('Add Customer')}
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">{tx('Select customer')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `— ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </section>

          {/* Date */}
          <section>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              {tx('Sale Date')}
            </label>
            <input
              type="datetime-local"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900"
            />
          </section>

          {/* Items */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {tx('Sale Items')}
                </h3>
              </div>

              <button
                type="button"
                onClick={addDraftItem}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                <Icon name="plus" className="h-3 w-3" />
                {tx('Add Item')}
              </button>
            </div>

            {draftItems.map((item, index) => {
              const productQuery = item.productSearch.trim().toLowerCase()
              const typeQuery = item.typeSearch.trim().toLowerCase()

              const matchingProducts =
                !item.product_id && productQuery
                  ? products
                      .filter((p) => p.name.toLowerCase().includes(productQuery))
                      .slice(0, 10)
                  : []

              const selectedProd = products.find((p) => p.id === item.product_id)
              const selectedProductTypes = item.product_id
                ? productTypes.filter((t) => t.product_id === item.product_id)
                : []

              const matchingTypes =
                item.product_id && !item.product_type_id && typeQuery
                  ? selectedProductTypes
                      .filter((t) => t.name.toLowerCase().includes(typeQuery))
                      .slice(0, 10)
                  : []

              const selectedType = getProductType(item.product_type_id)
              const typeStock = selectedType
                ? batches
                    .filter(
                      (b) =>
                        b.product_type_id === selectedType.id &&
                        b.status !== 'cancelled'
                    )
                    .reduce(
                      (sum, b) => sum + Number(b.remaining_quantity || 0),
                      0
                    )
                : 0

              const itemTotal =
                Number(item.quantity || 0) * Number(item.selling_price || 0)

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600">
                      {tx('Sale Item')} {index + 1}
                    </span>

                    {draftItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDraftItem(item.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        {tx('Remove')}
                      </button>
                    )}
                  </div>

                  {/* Product Search */}
                  <div>
                    <input
                      type="text"
                      value={selectedProd ? selectedProd.name : item.productSearch}
                      onChange={(e) =>
                        updateDraftItem(item.id, {
                          productSearch: e.target.value,
                          product_id: '',
                          product_type_id: '',
                          typeSearch: '',
                        })
                      }
                      placeholder={tx('Type a product name to search...')}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                    />

                    {matchingProducts.length > 0 && (
                      <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                        {matchingProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              updateDraftItem(item.id, {
                                product_id: p.id,
                                product_type_id: '',
                                productSearch: p.name,
                                typeSearch: '',
                              })
                            }
                            className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Product Type Search */}
                  <div className="mt-2.5">
                    <input
                      type="text"
                      value={selectedType ? selectedType.name : item.typeSearch}
                      onChange={(e) =>
                        updateDraftItem(item.id, {
                          typeSearch: e.target.value,
                          product_type_id: '',
                        })
                      }
                      placeholder={
                        item.product_id
                          ? tx('Type a product type / kind to search...')
                          : tx('Select a product first...')
                      }
                      disabled={!item.product_id}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
                    />

                    {matchingTypes.length > 0 && (
                      <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                        {matchingTypes.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              updateDraftItem(item.id, {
                                product_type_id: t.id,
                                typeSearch: t.name,
                              })
                            }
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                          >
                            <span className="font-semibold">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedType && (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {tx('Current stock:')} {typeStock.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Quantity & Selling Price */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-500">
                        {tx('Quantity')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateDraftItem(item.id, { quantity: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>

                    <div>
                      <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-500">
                        {tx('Selling Price / Item')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.selling_price}
                        onChange={(e) =>
                          updateDraftItem(item.id, {
                            selling_price: e.target.value,
                          })
                        }
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>

                    <div>
                      <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-500">
                        {tx('Item Revenue')}
                      </label>
                      <div className="flex h-[34px] items-center rounded-xl bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
                        {formatMoney(itemTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </section>

          {/* Initial Payment */}
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <label className="mb-1 block text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {tx('Initial Payment')}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={initialPayment}
              onChange={(e) => setInitialPayment(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500 dark:border-emerald-800 dark:bg-slate-950"
            />
          </section>

          {/* Notes */}
          <section>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              {tx('Notes')} {tx('(optional)')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={tx('Optional sale notes...')}
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </section>

          {/* Summary Calculation */}
          <section className="rounded-2xl bg-slate-100 p-3.5 text-xs space-y-1.5 dark:bg-slate-900">
            <div className="flex justify-between">
              <span className="text-slate-500">{tx('Total Revenue')}</span>
              <span className="font-bold">{formatMoney(draftTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{tx('Initial Payment')}</span>
              <span className="font-bold text-emerald-600">
                {formatMoney(paymentNumber)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 dark:border-slate-800">
              <span className="font-bold">{tx('Amount Due')}</span>
              <span className="font-bold text-amber-600">
                {formatMoney(amountDue)}
              </span>
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button
              type="button"
              disabled={saving}
              onClick={() => setShowCreateModal(false)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              {tx('Cancel')}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
            >
              {saving ? tx('Creating Sale...') : tx('Create Sale')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        open={showCustomerModal}
        onClose={() => {
          if (!savingCustomer) setShowCustomerModal(false)
        }}
        title={tx('Add Customer')}
        description={tx('Create a customer without leaving the sales screen.')}
        size="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              {tx('Customer Name')}
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={tx('Enter customer name')}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              {tx('Phone')}
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={tx('Optional phone number')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              {tx('Address')}
            </label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder={tx('Optional address')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              {tx('Notes')}
            </label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={2}
              placeholder={tx('Optional customer notes')}
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button
              type="button"
              disabled={savingCustomer}
              onClick={() => setShowCustomerModal(false)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              {tx('Cancel')}
            </button>

            <button
              type="submit"
              disabled={savingCustomer}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              {savingCustomer ? tx('Saving...') : tx('Create Customer')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Sale Details Modal */}
      <Modal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={tx('Sale Details')}
        description={
          selectedSale
            ? `#${selectedSale.id.slice(0, 8)} • ${getCustomerName(
                selectedSale.customer_id
              )}`
            : undefined
        }
        size="xl"
      >
        {selectedSale && (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard
                label={tx('Customer')}
                value={getCustomerName(selectedSale.customer_id)}
                icon="users"
              />
              <InfoCard
                label={tx('Sale Date')}
                value={formatDate(selectedSale.sale_date)}
                icon="calendar"
              />
              <InfoCard
                label={tx('Revenue')}
                value={formatMoney(selectedSale.total_revenue)}
                icon="money"
              />
              <InfoCard
                label={tx('Amount Due')}
                value={formatMoney(selectedSale.amount_due)}
                icon="warning"
                tone="amber"
              />
            </div>

            {/* Sold Items Table (Small & Scrollable) */}
            <div>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                {tx('Sold Items')}
              </h3>

              <div className="max-h-[280px] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-[750px] w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3.5 py-2.5 font-bold">{tx('Product Type / Kind')}</th>
                      <th className="px-3.5 py-2.5 font-bold">{tx('Product')}</th>
                      <th className="px-3.5 py-2.5 text-right font-bold">{tx('Quantity')}</th>
                      <th className="px-3.5 py-2.5 text-right font-bold">{tx('Selling Price')}</th>
                      <th className="px-3.5 py-2.5 text-right font-bold">{tx('Revenue')}</th>
                      <th className="px-3.5 py-2.5 text-right font-bold">{tx('Profit')}</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {saleItems.map((item) => {
                      const type = getProductType(item.product_type_id)
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-3.5 py-2 font-bold">{type?.name || 'Unknown'}</td>
                          <td className="px-3.5 py-2 text-slate-600 dark:text-slate-300">
                            {type ? getProductName(type.product_id) : 'Unknown'}
                          </td>
                          <td className="px-3.5 py-2 text-right">{item.quantity}</td>
                          <td className="px-3.5 py-2 text-right">{formatMoney(item.selling_price)}</td>
                          <td className="px-3.5 py-2 text-right font-bold">{formatMoney(item.revenue)}</td>
                          <td className="px-3.5 py-2 text-right font-bold text-emerald-600">
                            {formatMoney(item.profit)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment History Table (Small & Scrollable) */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {tx('Payment History')}
                </h3>

                {Number(selectedSale.amount_due) > 0 && (
                  <button
                    type="button"
                    onClick={() => openPaymentModal(selectedSale)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Icon name="plus" className="h-3 w-3" />
                    {tx('+ Add Payment')}
                  </button>
                )}
              </div>

              {payments.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-slate-900">
                  {tx('No separate payment records found.')}
                </p>
              ) : (
                <div className="max-h-[220px] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-[650px] w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                      <tr>
                        <th className="px-3.5 py-2.5 font-bold">{tx('Payment Date')}</th>
                        <th className="px-3.5 py-2.5 text-right font-bold">{tx('Amount')}</th>
                        <th className="px-3.5 py-2.5 font-bold">{tx('Notes')}</th>
                        <th className="px-3.5 py-2.5 text-right font-bold">{tx('Action')}</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-3.5 py-2">{formatDate(p.payment_date)}</td>
                          <td className="px-3.5 py-2 text-right font-bold text-emerald-600">
                            {formatMoney(p.amount)}
                          </td>
                          <td className="px-3.5 py-2 text-slate-500">{p.notes || '—'}</td>
                          <td className="px-3.5 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => openCorrectPaymentModal(p)}
                              className="rounded-lg bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-300"
                            >
                              {tx('Edit')}
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

      {/* Record Payment Modal */}
      <Modal
        open={showPaymentModal}
        onClose={() => {
          if (!savingPayment) setShowPaymentModal(false)
        }}
        title={tx('Record Payment')}
        size="md"
      >
        {selectedSale && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="rounded-2xl bg-amber-50 p-3.5 dark:bg-amber-950/20 text-xs space-y-1">
              <p className="font-bold text-amber-800 dark:text-amber-200">
                {tx('Remaining Due')}: {formatMoney(selectedSale.amount_due)}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {tx('Payment Amount')}
              </label>
              <input
                type="number"
                min="1"
                max={selectedSaleDue}
                step="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={tx('Enter amount')}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={() => setPaymentAmount(String(selectedSaleDue))}
                className="mt-1 text-xs font-bold text-emerald-600 hover:underline"
              >
                {tx('Pay Full Due')}
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {tx('Payment Date')}
              </label>
              <input
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {tx('Notes')}
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                placeholder={tx('Optional payment note...')}
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              <button
                type="button"
                disabled={savingPayment}
                onClick={() => setShowPaymentModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                {tx('Cancel')}
              </button>

              <button
                type="submit"
                disabled={savingPayment}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {savingPayment ? tx('Recording...') : tx('Record Payment')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Correct Payment Modal */}
      <Modal
        open={showCorrectPaymentModal}
        onClose={() => {
          if (!correctingPayment) setShowCorrectPaymentModal(false)
        }}
        title={tx('Edit Payment')}
        description={tx(
          'Correct the amount, date or notes for an existing payment.'
        )}
        size="md"
      >
        {selectedPayment && (
          <form onSubmit={handleCorrectPayment} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {tx('Corrected Payment Amount')}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={correctPaymentAmount}
                onChange={(e) => setCorrectPaymentAmount(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {tx('Payment Date')}
              </label>
              <input
                type="datetime-local"
                value={correctPaymentDate}
                onChange={(e) => setCorrectPaymentDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {tx('Payment Notes')}
              </label>
              <textarea
                value={correctPaymentNotes}
                onChange={(e) => setCorrectPaymentNotes(e.target.value)}
                rows={2}
                placeholder={tx('Payment note...')}
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              <button
                type="button"
                disabled={correctingPayment}
                onClick={() => setShowCorrectPaymentModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                {tx('Cancel')}
              </button>

              <button
                type="submit"
                disabled={correctingPayment}
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700"
              >
                {correctingPayment ? tx('Saving...') : tx('Save Correction')}
              </button>
            </div>
          </form>
        )}
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
  subtitle,
  accent,
  icon,
}: {
  label: string
  value: string
  subtitle: string
  accent: 'indigo' | 'blue' | 'emerald' | 'amber'
  icon: string
}) {
  const styles = {
    indigo: {
      icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    },
    blue: {
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    emerald: {
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    amber: {
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    },
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1.5 truncate text-2xl font-black tracking-tight">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles[accent].icon}`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>
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
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Icon name="check" className="h-3 w-3" />
        {isRw ? 'Yishyuwe' : 'Paid'}
      </span>
    )
  }

  if (normalized === 'partial') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        <Icon name="clock" className="h-3 w-3" />
        {isRw ? 'Yishyuwe igice' : 'Partial'}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
      <Icon name="warning" className="h-3 w-3" />
      {isRw ? 'Ntiyishyuwe' : 'Unpaid'}
    </span>
  )
}

function InfoCard({
  label,
  value,
  icon,
  tone = 'slate',
}: {
  label: string
  value: string
  icon: string
  tone?: 'slate' | 'amber'
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 ${
        tone === 'amber'
          ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20'
          : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
      }`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          tone === 'amber'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'
        }`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </div>

      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-0.5 truncate text-sm font-black ${
          tone === 'amber' ? 'text-amber-700 dark:text-amber-300' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Icon({
  name,
  className = 'h-4 w-4',
}: {
  name: string
  className?: string
}) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
  }

  switch (name) {
    case 'sales':
      return (
        <svg {...common}>
          <path d="M4 19V9" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M22 19H2" />
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
    case 'profit':
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M6 16V9" />
          <path d="M12 16V5" />
          <path d="M18 16v-4" />
          <path d="m5 7 4-3 4 2 5-4" />
          <path d="M16 2h2v2" />
        </svg>
      )
    case 'warning':
      return (
        <svg {...common}>
          <path d="m12 3 9 17H3z" />
          <path d="M12 9v5" />
          <path d="M12 17v.01" />
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
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      )
    case 'eye':
      return (
        <svg {...common}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M8 2.5v4" />
          <path d="M16 2.5v4" />
          <path d="M3 9h18" />
        </svg>
      )
    case 'package':
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
          <path d="m4 7.5 8 4.5 8-4.5" />
          <path d="M12 12v9" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    default:
      return null
  }
}