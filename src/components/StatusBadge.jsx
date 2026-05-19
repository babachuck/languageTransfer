import React from 'react'

export default function StatusBadge({ status }) {
  const config = {
    pending: { label: '待审核', cls: 'badge-pending' },
    reviewed: { label: '已审核', cls: 'badge-reviewed' },
    archived: { label: '已归档', cls: 'badge-archived' },
  }
  const { label, cls } = config[status] || config.pending

  return <span className={`status-badge ${cls}`}>{label}</span>
}
