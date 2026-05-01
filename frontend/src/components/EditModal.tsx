import React, { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle } from 'lucide-react'
import {
  validateEdit,
  isFieldEditable,
  canEditRecord,
} from '../services/validationService'

interface EditModalProps {
  isOpen: boolean
  title: string
  module: string
  record: any
  onClose: () => void
  onSave: (updatedRecord: any) => Promise<void>
  fields: Array<{
    name: string
    label: string
    type: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'select'
    required?: boolean
    options?: Array<{ value: string; label: string }>
    placeholder?: string
    disabled?: boolean
  }>
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  title,
  module,
  record,
  onClose,
  onSave,
  fields,
}) => {
  const [formData, setFormData] = useState(record)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setFormData(record)
    setErrors({})
    setValidationErrors([])
    setSuccessMessage('')
  }, [record, isOpen])

  const handleFieldChange = (fieldName: string, value: any) => {
    // Check if field is editable
    if (!isFieldEditable(module as any, fieldName, record)) {
      return
    }

    const newFormData = { ...formData, [fieldName]: value }
    setFormData(newFormData)

    // Clear field error when user starts typing
    if (errors[fieldName]) {
      setErrors({ ...errors, [fieldName]: '' })
    }
  }

  const handleSave = async () => {
    // Validate required fields
    const newErrors: { [key: string]: string } = {}
    fields.forEach((field) => {
      if (
        field.required &&
        !isFieldEditable(module as any, field.name, record)
      ) {
        return // Skip non-editable required fields
      }

      if (
        field.required &&
        (!formData[field.name] || formData[field.name].toString().trim() === '')
      ) {
        newErrors[field.name] = `${field.label} is required`
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Validate business rules
    const validation = validateEdit(module as any, formData, record)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    try {
      setIsLoading(true)
      setValidationErrors([])
      await onSave(formData)
      setSuccessMessage('Record updated successfully!')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error: any) {
      setValidationErrors([error.message || 'Failed to save changes'])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !canEditRecord(module as any, record)) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
              <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <div className="flex gap-3">
                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-900 font-semibold">Validation Errors:</p>
                  <ul className="text-sm text-red-700 mt-1 space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map((field) => {
              const isEditable = isFieldEditable(module as any, field.name, record)
              const fieldError = errors[field.name]

              return (
                <div
                  key={field.name}
                  className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      disabled={!isEditable || isLoading}
                      placeholder={field.placeholder}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                        fieldError
                          ? 'border-red-300 focus:ring-red-200'
                          : 'border-gray-300 focus:ring-blue-200'
                      } ${!isEditable ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      rows={4}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      disabled={!isEditable || isLoading}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                        fieldError
                          ? 'border-red-300 focus:ring-red-200'
                          : 'border-gray-300 focus:ring-blue-200'
                      } ${!isEditable ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      disabled={!isEditable || isLoading}
                      placeholder={field.placeholder}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                        fieldError
                          ? 'border-red-300 focus:ring-red-200'
                          : 'border-gray-300 focus:ring-blue-200'
                      } ${!isEditable ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  )}

                  {fieldError && (
                    <p className="text-red-500 text-sm mt-1">{fieldError}</p>
                  )}

                  {!isEditable && (
                    <p className="text-gray-500 text-xs mt-1 italic">
                      This field is not editable for {record.status} records
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t sticky bottom-0 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditModal
