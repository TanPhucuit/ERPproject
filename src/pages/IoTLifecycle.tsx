import React, { useEffect, useMemo, useState } from 'react'
import { Search, Plus, Shield, AlertTriangle, CheckCircle, XCircle, X, Cpu, Wifi } from 'lucide-react'
import { erpApi } from '../services/erpApi'
import {
  ActionToolbar,
  formatCurrency,
  ModuleHeader,
  ModuleTabs,
  RecordActions,
  StatusBadge,
  ViewMode,
  KanbanBoard,
} from '../components/OdooLite'
import { useUIStore } from '../stores/uiStore'

// ========== IoT DEVICE TYPES ==========
const activationStatuses = [
  { value: 'not_activated', label: 'Chưa kích hoạt', color: 'bg-gray-100 text-gray-700' },
  { value: 'activated', label: 'Đã kích hoạt', color: 'bg-green-100 text-green-700' },
  { value: 'deactivated', label: 'Đã hủy kích hoạt', color: 'bg-red-100 text-red-700' },
  { value: 'expired', label: 'Hết hạn', color: 'bg-orange-100 text-orange-700' },
]

const alertTypes = [
  { value: 'warranty_expiring', label: 'Bảo hành sắp hết', icon: AlertTriangle, color: 'text-yellow-600' },
  { value: 'warranty_expired', label: 'Bảo hành hết hạn', icon: XCircle, color: 'text-red-600' },
  { value: 'low_battery', label: 'Pin yếu', icon: AlertTriangle, color: 'text-orange-600' },
  { value: 'connection_lost', label: 'Mất kết nối', icon: Wifi, color: 'text-blue-600' },
  { value: 'maintenance_due', label: 'Bảo trì định kỳ', icon: Cpu, color: 'text-purple-600' },
]

const alertStatuses = [
  { value: 'open', label: 'Mới', color: 'bg-red-100 text-red-700' },
  { value: 'acknowledged', label: 'Đã xác nhận', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'resolved', label: 'Đã xử lý', color: 'bg-green-100 text-green-700' },
  { value: 'dismissed', label: 'Bỏ qua', color: 'bg-gray-100 text-gray-700' },
]

const severityColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700',
}

// ========== DEVICE REGISTRATION MODAL ==========
const DeviceModal: React.FC<{
  isOpen: boolean
  record: any | null
  products: any[]
  customers: any[]
  warehouses: any[]
  onClose: () => void
  onSave: (data: any) => void
}> = ({ isOpen, record, products, customers, warehouses, onClose, onSave }) => {
  const [form, setForm] = useState({
    product_id: '',
    serial_number: '',
    mac_address: '',
    imei: '',
    activation_status: 'not_activated',
    warranty_start_date: new Date().toISOString().slice(0, 10),
    warranty_end_date: '',
    customer_id: '',
    bin_location_id: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (record) {
      setForm({
        product_id: record.product_id || '',
        serial_number: record.serial_number || '',
        mac_address: record.mac_address || '',
        imei: record.imei || '',
        activation_status: record.activation_status || 'not_activated',
        warranty_start_date: record.warranty_start_date || new Date().toISOString().slice(0, 10),
        warranty_end_date: record.warranty_end_date || '',
        customer_id: record.customer_id || '',
        bin_location_id: record.bin_location_id || '',
        notes: record.notes || '',
      })
    } else {
      setForm({
        product_id: '',
        serial_number: '',
        mac_address: '',
        imei: '',
        activation_status: 'not_activated',
        warranty_start_date: new Date().toISOString().slice(0, 10),
        warranty_end_date: '',
        customer_id: '',
        bin_location_id: '',
        notes: '',
      })
    }
    setErrors({})
  }, [record, isOpen])

  const update = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const handleSave = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.serial_number.trim()) nextErrors.serial_number = 'Serial number là bắt buộc'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSave(form)
  }

  const productOptions = products.filter(p => p.is_iot_device || p.requires_serial_scan).map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))
  const customerOptions = customers.map(c => ({ value: c.id, label: c.name }))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg mt-4 mb-8">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {record?.id ? 'Sửa thiết bị IoT' : 'Đăng ký thiết bị IoT mới'}
          </h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-gray-700">Sản phẩm <span className="text-red-500">*</span></label>
              <select value={form.product_id} onChange={e => update('product_id', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">-- Chọn sản phẩm --</option>
                {productOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Serial Number <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.serial_number} onChange={e => update('serial_number', e.target.value)}
                placeholder="VD: SN-2024-001234"
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.serial_number ? 'border-red-400' : 'border-gray-300'}`} />
              {errors.serial_number && <p className="mt-1 text-xs text-red-600">{errors.serial_number}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">MAC Address</label>
              <input type="text" value={form.mac_address} onChange={e => update('mac_address', e.target.value)}
                placeholder="VD: AA:BB:CC:DD:EE:FF"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">IMEI</label>
              <input type="text" value={form.imei} onChange={e => update('imei', e.target.value)}
                placeholder="15 chữ số"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Trạng thái kích hoạt</label>
              <select value={form.activation_status} onChange={e => update('activation_status', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                {activationStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Ngày bắt đầu bảo hành</label>
              <input type="date" value={form.warranty_start_date} onChange={e => update('warranty_start_date', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Ngày kết thúc bảo hành</label>
              <input type="date" value={form.warranty_end_date} onChange={e => update('warranty_end_date', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Khách hàng</label>
              <select value={form.customer_id} onChange={e => update('customer_id', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">-- Không gán --</option>
                {customerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-gray-700">Ghi chú</label>
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">Hủy</button>
          <button onClick={handleSave} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {record?.id ? 'Cập nhật' : 'Đăng ký thiết bị'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== MAIN IOT LIFECYCLE PAGE ==========
const IoTLifecyclePage: React.FC = () => {
  const showNotification = useUIStore(s => s.showNotification)
  const [activeTab, setActiveTab] = useState('devices')
  const [devices, setDevices] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [warranties, setWarranties] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    Promise.all([
      erpApi.get<any[]>('/iot/devices?limit=200'),
      erpApi.get<any[]>('/iot/warranty-alerts?limit=200'),
      erpApi.get<any[]>('/products?limit=500'),
      erpApi.get<any[]>('/customers?limit=500'),
    ])
      .then(([deviceData, alertData, productData, customerData]) => {
        setDevices(deviceData)
        setAlerts(alertData)
        setProducts(productData)
        setCustomers(customerData)
        setLoadError(null)
      })
      .catch(e => {
        setDevices([]); setAlerts([]); setProducts([]); setCustomers([])
        setLoadError(e.message)
      })
  }, [])

  const isExpiringSoon = (endDate: string) => {
    if (!endDate) return false
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days > 0 && days <= 30
  }

  const getWarrantyStatus = (endDate: string) => {
    if (!endDate) return 'unknown'
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'expired'
    if (days <= 30) return 'expiring_soon'
    return 'active'
  }

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const haystack = `${d.serial_number || ''} ${d.mac_address || ''} ${d.product_name || d.product?.name || ''} ${d.customer_name || d.customer?.name || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || d.activation_status === status)
    })
  }, [devices, search, status])

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      const haystack = `${a.alert_title || ''} ${a.serial_number || ''} ${a.product_name || ''} ${a.customer_name || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || a.status === status)
    })
  }, [alerts, search, status])

  const openCreate = () => { setModalRecord(null); setModalOpen(true) }
  const openEdit = (device: any) => { setModalRecord(device); setModalOpen(true) }

  const handleSave = async (formData: any) => {
    try {
      if (modalRecord?.id) {
        await erpApi.put(`/iot/devices/${modalRecord.id}`, formData)
      } else {
        const created = await erpApi.post<any>('/iot/devices', formData)
        formData.id = created.id
      }
    } catch (e: any) {
      showNotification('error', `Lưu thất bại: ${e.message}`)
      return
    }
    setDevices(current => {
      const exists = current.some(d => d.id === formData.id)
      if (exists) return current.map(d => d.id === formData.id ? { ...d, ...formData } : d)
      return [{ id: formData.id, ...formData }, ...current]
    })
    setModalOpen(false)
    showNotification('success', 'Thiết bị IoT đã được lưu.')
  }

  const acknowledgeAlert = async (alert: any) => {
    try {
      await erpApi.put(`/iot/warranty-alerts/${alert.id}`, { status: 'acknowledged' })
    } catch (e: any) {
      showNotification('error', `Cập nhật thất bại: ${e.message}`)
      return
    }
    setAlerts(current => current.map(a => a.id === alert.id ? { ...a, status: 'acknowledged' } : a))
    showNotification('success', 'Alert đã được xác nhận.')
  }

  const resolveAlert = async (alert: any) => {
    try {
      await erpApi.put(`/iot/warranty-alerts/${alert.id}`, { status: 'resolved' })
    } catch (e: any) {
      showNotification('error', `Cập nhật thất bại: ${e.message}`)
      return
    }
    setAlerts(current => current.map(a => a.id === alert.id ? { ...a, status: 'resolved' } : a))
    showNotification('success', 'Alert đã được xử lý xong.')
  }

  const runWarrantyScan = async () => {
    setScanning(true)
    try {
      const result: any = await erpApi.post<any>('/iot/warranty-scan', { warning_days: 30 })
      // Reload alerts
      const alertData = await erpApi.get<any[]>('/iot/warranty-alerts?limit=200')
      setAlerts(alertData)
      if (result.new_alerts === 0) {
        showNotification('success', `Đã quét warranty scan: không có thiết bị nào cần cảnh báo thêm.`)
      } else {
        showNotification('success', `Đã tạo ${result.new_alerts} cảnh báo bảo hành mới!`)
      }
    } catch (e: any) {
      showNotification('error', `Quét thất bại: ${e.message}`)
    } finally {
      setScanning(false)
    }
  }

  // Stats
  const stats = useMemo(() => {
    const activated = devices.filter(d => d.activation_status === 'activated').length
    const notActivated = devices.filter(d => d.activation_status === 'not_activated').length
    const expiring = devices.filter(d => isExpiringSoon(d.warranty_end_date)).length
    const openAlerts = alerts.filter(a => a.status === 'open').length
    return { total: devices.length, activated, notActivated, expiring, openAlerts }
  }, [devices, alerts])

  const getActivationBadge = (status: string) => {
    const found = activationStatuses.find(s => s.value === status)
    return found ? <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${found.color}`}>{found.label}</span> : <span>{status}</span>
  }

  const getAlertIcon = (type: string) => {
    const found = alertTypes.find(a => a.value === type)
    if (!found) return <AlertTriangle size={16} />
    const Icon = found.icon
    return <Icon size={16} className={found.color} />
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="IoT Device Lifecycle"
        subtitle="Quản lý Serial/MAC, kích hoạt bảo hành và cảnh báo chủ động cho thiết bị SmartHome (Camera, Robot, Smart Lock)."
        primaryLabel="Đăng ký thiết bị mới"
        onCreate={openCreate}
      />

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Không thể tải dữ liệu IoT: {loadError}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Tổng thiết bị</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-green-600">Đã kích hoạt</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{stats.activated}</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-yellow-600">Sắp hết BH (&lt;30 ngày)</p>
          <p className="mt-1 text-2xl font-bold text-yellow-700">{stats.expiring}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-600">Alert mới chưa xử lý</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{stats.openAlerts}</p>
        </div>
      </div>

      <ModuleTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'devices', label: 'Thiết bị', count: devices.length },
          { id: 'alerts', label: 'Cảnh báo bảo hành', count: alerts.filter(a => a.status === 'open').length },
        ]}
      />

      {activeTab === 'devices' && (
        <>
          <ActionToolbar
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            statuses={activationStatuses.map(s => s.value)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {viewMode === 'list' ? (
            <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Serial / MAC</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Kích hoạt</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bảo hành</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Trạng thái BH</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDevices.map(device => {
                    const wStatus = getWarrantyStatus(device.warranty_end_date)
                    return (
                      <tr key={device.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-blue-700">{device.serial_number}</p>
                          {device.mac_address && <p className="text-xs text-gray-500 font-mono">{device.mac_address}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{device.product_name || device.product?.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{device.customer_name || device.customer?.name || '-'}</td>
                        <td className="px-4 py-3">{getActivationBadge(device.activation_status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {device.warranty_start_date && <p>Từ: {new Date(device.warranty_start_date).toLocaleDateString('vi-VN')}</p>}
                          {device.warranty_end_date && <p>Đến: {new Date(device.warranty_end_date).toLocaleDateString('vi-VN')}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {wStatus === 'expired' && <StatusBadge status="expired" />}
                          {wStatus === 'expiring_soon' && <StatusBadge status="expiring_soon" />}
                          {wStatus === 'active' && <StatusBadge status="active" />}
                          {wStatus === 'unknown' && <span className="text-xs text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          <RecordActions onEdit={() => openEdit(device)} onDelete={() => {}} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <KanbanBoard
              records={filteredDevices}
              groupBy={d => d.activation_status}
              renderCard={device => (
                <div key={device.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="font-bold text-gray-900">{device.serial_number}</p>
                  <p className="text-sm text-gray-600">{device.product_name || device.product?.name}</p>
                  {device.mac_address && <p className="text-xs text-gray-400 font-mono mt-1">{device.mac_address}</p>}
                  <div className="mt-2">{getActivationBadge(device.activation_status)}</div>
                  <div className="mt-2">
                    {isExpiringSoon(device.warranty_end_date) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                        <AlertTriangle size={12} /> Sắp hết BH
                      </span>
                    )}
                  </div>
                </div>
              )}
            />
          )}
        </>
      )}

      {activeTab === 'alerts' && (
        <>
          <div className="flex items-center justify-between">
            <ActionToolbar
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              statuses={alertStatuses.map(s => s.value)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
            <button onClick={runWarrantyScan}
              disabled={scanning}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 flex items-center gap-2">
              {scanning ? 'Đang quét...' : '🔍 Quét BH chủ động'}
            </button>
          </div>

          {viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredAlerts.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                  Không có cảnh báo nào.
                </div>
              ) : (
                filteredAlerts.map(alert => (
                  <div key={alert.id} className={`rounded-lg border p-4 ${
                    alert.severity === 'critical' ? 'border-red-300 bg-red-50' :
                    alert.severity === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getAlertIcon(alert.alert_type)}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900">{alert.alert_title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityColors[alert.severity] || severityColors.info}`}>
                              {alert.severity}
                            </span>
                            <StatusBadge status={alert.status} />
                          </div>
                          <p className="text-sm text-gray-700">{alert.alert_message}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {alert.serial_number} • {alert.product_name} • {alert.customer_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.status === 'open' && (
                          <button onClick={() => acknowledgeAlert(alert)}
                            className="rounded-md border border-yellow-400 bg-white px-3 py-1.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-50">
                            Xác nhận
                          </button>
                        )}
                        {(alert.status === 'open' || alert.status === 'acknowledged') && (
                          <button onClick={() => resolveAlert(alert)}
                            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                            Đã xử lý
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <KanbanBoard
              records={filteredAlerts}
              groupBy={a => a.status}
              renderCard={alert => (
                <div key={alert.id} className={`rounded-md border p-3 ${
                  alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
                  alert.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-start gap-2 mb-2">
                    {getAlertIcon(alert.alert_type)}
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{alert.alert_title}</p>
                      <p className="text-xs text-gray-500">{alert.serial_number}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 mb-2">{alert.alert_message}</p>
                  <StatusBadge status={alert.status} />
                </div>
              )}
            />
          )}
        </>
      )}

      <DeviceModal
        isOpen={modalOpen}
        record={modalRecord}
        products={products}
        customers={customers}
        warehouses={[]}
        onClose={() => { setModalOpen(false); setModalRecord(null) }}
        onSave={handleSave}
      />
    </div>
  )
}

export default IoTLifecyclePage
