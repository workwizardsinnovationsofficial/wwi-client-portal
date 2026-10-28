import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Login } from '../pages/auth/Login'
import { ForgotPassword } from '../pages/auth/ForgotPassword'
import { BootstrapSuperAdmin } from '../pages/auth/BootstrapSuperAdmin'
import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'

// Wrapper helper
function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Authentication Views & Forms', () => {
  it('renders sign-in form with official corporate branding', () => {
    renderWithProviders(<Login />)
    const brandElements = screen.getAllByText(/Work Wizards Innovations/i)
    expect(brandElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByLabelText(/Official Email/i)).toBeInTheDocument()
    expect(screen.getByText(/^Password$/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('allows user input in login fields', () => {
    renderWithProviders(<Login />)
    const emailInput = screen.getByLabelText(/Official Email/i)
    const passwordInput = screen.getByPlaceholderText(/••••••••••••/i)

    fireEvent.change(emailInput, { target: { value: 'admin@workwizards.in' } })
    fireEvent.change(passwordInput, { target: { value: 'Secr3tP@ssword!' } })

    expect(emailInput.value).toBe('admin@workwizards.in')
    expect(passwordInput.value).toBe('Secr3tP@ssword!')
  })

  it('renders password reset flow', () => {
    renderWithProviders(<ForgotPassword />)
    expect(screen.getByText(/Reset Your Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send Password Reset Link/i })).toBeInTheDocument()
  })

  it('renders bootstrap super-admin provisioning form with secret key input', () => {
    renderWithProviders(<BootstrapSuperAdmin />)
    expect(screen.getByText(/Bootstrap Super Administrator/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Bootstrap Secret Key/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Initialize Super Administrator/i })).toBeInTheDocument()
  })
})
