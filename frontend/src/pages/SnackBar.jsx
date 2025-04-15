import React from 'react'
import '../styles/SnackBar.css'
export default function SnackBar({message, show}) {
  return (
    <div className={`snackbar ${show? 'show': ''}`}>
      {message}
    </div>
  )
}
