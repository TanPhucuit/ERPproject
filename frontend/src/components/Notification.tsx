import React from 'react'

interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  show: boolean
}

const Notification: React.FC<NotificationProps> = ({ type, message, show }) => {
  if (!show) return null

  const bgColor = {
    success: 'bg-green-100 text-green-800 border-green-300',
    error: 'bg-red-100 text-red-800 border-red-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
  }[type]

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg border ${bgColor} shadow-lg`}>
      <p>{message}</p>
    </div>
  )
}

export default Notification
