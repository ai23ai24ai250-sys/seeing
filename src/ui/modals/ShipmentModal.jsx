// =============================================================================
// ui/modals/ShipmentModal.jsx — نافذة توريد شحنة جديدة — نسخة React من
// openShipmentModal (js/components/products-view.js)
// -----------------------------------------------------------------------------
// إضافة كمية مخزون مع خيار ربط الشحنة بمورد (تُضاف تكلفة البضاعة لمديونيته).
// مصاريف الشحن/النسريات لا تُضاف للمديونية بل تُوزَّع على تكلفة القطعة
// (متوسط مرجّح COGS) مع عرض فوري للحسابات. الحفظ عبر
// window.addStockShipment(productId, qty, supplierId, unitPrice, notes, extras).
// =============================================================================
import { useState, useMemo } from 'react'
import { PackagePlus } from 'lucide-react'
import Modal from '../components/Modal.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import Button from '../components/Button.jsx'
import { useUiStore } from '../state/uiStore.js'
import { showToast } from '../components/toastStore.js'
import { round2, formatCurrency } from '@/utils/formatters'

function ShipmentModal() {
  const open = useUiStore(s => s.shipmentModal.open)
  if (!open) return null
  return <ShipmentModalInner />
}

function ShipmentModalInner() {
  const { productId, onDone } = useUiStore(s => s.shipmentModal)
  const close = useUiStore(s => s.closeShipmentModal)

  const [product] = useState(() => (productId && window.getProductById ? window.getProductById(productId) : null))
  const suppliers = typeof window !== 'undefined' && window.getSuppliers ? window.getSuppliers() : []

  const [supplierId, setSupplierId] = useState(product ? product.supplierId || '' : '')
  const [qty, setQty] = useState('10')
  const [unitPrice, setUnitPrice] = useState(product ? product.purchasePrice || '' : '')
  const [shippingCost, setShippingCost] = useState('0')
  const [suppliesCost, setSuppliesCost] = useState('0')
  const [notes, setNotes] = useState('')

  const oldStock = Number(product ? product.stock : 0) || 0
  const oldPrice = Number(product ? product.purchasePrice : 0) || 0

  const calc = useMemo(() => {
    const q = Number(qty) || 0
    const p = Number(unitPrice) || 0
    const ship = Number(shippingCost) || 0
    const supplies = Number(suppliesCost) || 0
    const extrasTotal = round2(ship + supplies)
    const goodsCost = q * p
    const totalCost = oldStock * oldPrice + goodsCost + extrasTotal
    const newAvg = oldStock + q > 0 ? round2(totalCost / (oldStock + q)) : 0
    return { goodsCost, extrasTotal, newAvg }
  }, [qty, unitPrice, shippingCost, suppliesCost, oldStock, oldPrice])

  const handleSubmit = e => {
    e.preventDefault()
    try {
      window.addStockShipment(
        product.id,
        qty,
        supplierId,
        unitPrice,
        notes,
        { shippingCost, suppliesCost }
      )
      showToast(`تمت إضافة ${qty} قطعة للمخزون وتحديث حساب المورد بنجاح`, 'success')
      close()
      if (typeof onDone === 'function') onDone()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (!product) return null

  return (
    <Modal open onClose={close} title={`📦 توريد شحنة جديدة: ${product.name}`} icon={PackagePlus} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-white text-base">{product.name}</h4>
            <p className="text-xs text-amber-400 font-mono">كود الـ SKU: {product.code || product.id}</p>
          </div>
          <div className="text-left">
            <span className="text-xs text-slate-400 block">المخزون الحالي</span>
            <span className="text-lg font-extrabold text-emerald-400 num-font">{oldStock} قطعة</span>
          </div>
        </div>

        <Select
          label="المورد / المصنع المورد لهذه الشحنة (اختياري لتسجيل المديونية)"
          value={supplierId}
          onChange={setSupplierId}
          options={[{ value: '', label: '(بدون ربط بمورد مباشر)' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="الكمية المضافة * (قطعة)" type="number" value={qty} onChange={setQty} required className="text-center text-emerald-300" />
          <Input label="سعر الشراء / التكلفة للقطعة * (ج.م)" type="number" value={unitPrice} onChange={setUnitPrice} required className="text-center" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-950/40 rounded-xl border border-amber-800/40">
          <Input label="مصاريف الشحن (ج.م)" type="number" value={shippingCost} onChange={setShippingCost} className="text-amber-300" />
          <Input label="نسريات / مستلزمات الشحنة (ج.م)" type="number" value={suppliesCost} onChange={setSuppliesCost} className="text-amber-300" />
          <p className="sm:col-span-2 text-[11px] font-bold text-amber-400/80">
            💡 مصاريف الشحن والنسريات لا تُضاف لمديونية المورد — تُوزَّع على تكلفة القطعة فترفع متوسط تكلفة الشراء (COGS).
          </p>
        </div>

        <div className="space-y-1.5 p-3 bg-purple-950/30 rounded-xl border border-purple-800/40 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-purple-300 font-bold">تكلفة البضاعة (تُضاف لمديونية المورد):</span>
            <span className="font-extrabold text-purple-400 num-font">{formatCurrency(calc.goodsCost)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-amber-300 font-bold">مصاريف شحن/نسريات (تُوزَّع على القطعة):</span>
            <span className="font-extrabold text-amber-400 num-font">{formatCurrency(calc.extrasTotal)}</span>
          </div>
          <div className="border-t border-purple-800/50 pt-1.5 flex justify-between items-center">
            <span className="text-slate-200 font-bold">متوسط التكلفة الجديد للقطعة (COGS):</span>
            <span className="font-extrabold text-white num-font">{formatCurrency(calc.newAvg)}</span>
          </div>
        </div>

        <Input label="بيانات وملاحظات الشحنة / رقم الفاتورة" value={notes} onChange={setNotes} placeholder="مثال: توريد شحنة من مصنع المورا فاتورة رقم 804" />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>إلغاء</Button>
          <Button type="submit" variant="success" icon={PackagePlus} className="px-6">
            إضافة الكمية وتسميع حساب المورد
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ShipmentModal
