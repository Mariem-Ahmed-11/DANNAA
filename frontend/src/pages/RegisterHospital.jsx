import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiRequest } from '../api'
import { useLocale } from '../i18n'
import '../App.css'

const initialForm = {
  name: '',
  governorate: '',
  city: '',
  address: '',
  phone: '',
  contact_email: '',
  short_description: '',
  overview: '',
  website_url: '',
  working_hours: '',
  establishment_year: '',
  location_url: '',
  contact_name: '',
  email: '',
  password: '',
  password_confirmation: '',
}

function RegisterHospital() {
  const { t } = useLocale()
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoFile, setLogoFile] = useState(null)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setFormError('')
    setIsSubmitting(true)

    try {
      const data = new FormData()
      for (const [field, value] of Object.entries(form)) {
        data.append(field, value.trim())
      }
      data.append('logo', logoFile)

      await apiRequest('/api/hospitals', {
        method: 'POST',
        body: data,
      })
      setSubmitted(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(error.errors).map(([field, messages]) => [field.split('.')[0], messages[0]])
          )
        )
        setFormError('Please correct the highlighted fields.')
      } else {
        setFormError(error.message || 'The registration could not be submitted.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="login-card" aria-labelledby="registration-heading">
        <Link className="login-brand" to="/login" aria-label={t('DHANA sign in')}>
          <img
            className="login-logo"
            src="/dhana-logo-removebg-preview.png"
            alt={t('DHANA neonatal care logo')}
          />
          <span>
            <strong>DHANA</strong>
            <small>ضنى · {t('Neonatal Care')}</small>
          </span>
        </Link>

        {submitted ? (
          <div className="login-intro" role="status">
            <span className="eyebrow">{t('REGISTRATION RECEIVED')}</span>
            <h1 id="registration-heading">{t('Awaiting review')}</h1>
            <p>{t('Your hospital request is pending Super Admin review. The account will remain unavailable until the hospital is approved.')}</p>
            <Link className="primary-button" to="/login">{t('Return to sign in')}</Link>
          </div>
        ) : (
          <>
            <div className="login-intro">
              <span className="eyebrow">{t('HOSPITAL ACCOUNT')}</span>
              <h1 id="registration-heading">{t('Request registration')}</h1>
              <p>{t('Submit your hospital and responsible staff details for review.')}</p>
            </div>

            {formError && <div className="login-error" role="alert">{t(formError)}</div>}

            <form className="login-form registration-form" onSubmit={handleSubmit}>
              <section className="registration-section" aria-labelledby="registration-hospital-heading">
                <h2 id="registration-hospital-heading">{t('Hospital profile information')}</h2>
                <p>{t('Complete the required hospital contact and location information. Other profile details can be updated after approval.')}</p>
              </section>
              {[
                ['name', 'Hospital name', 'text', 'organization', true],
                ['governorate', 'Governorate', 'text', 'address-level1', true],
                ['city', 'City', 'text', 'address-level2', true],
                ['address', 'Street address', 'text', 'street-address', true],
                ['phone', 'Hospital contact phone', 'tel', 'tel', true],
                ['contact_email', 'Hospital contact email', 'email', 'email', true],
                ['short_description', 'Short description (optional)', 'text', 'off', false],
                ['overview', 'Detailed overview (optional)', 'text', 'off', false],
                ['website_url', 'Website URL (provide this or a Google Maps/location link)', 'url', 'url', false],
                ['working_hours', 'Working hours (optional)', 'text', 'off', false],
                ['establishment_year', 'Establishment year (optional)', 'number', 'off', false],
                ['location_url', 'Google Maps or location URL (provide this or a website URL)', 'url', 'url', false],
              ].map(([field, label, type, autoComplete, required]) => (
                <label key={field} htmlFor={`register-${field}`}>
                  {t(label)}
                  {['short_description', 'overview'].includes(field) ? (
                    <textarea
                      id={`register-${field}`}
                      name={field}
                      rows={field === 'overview' ? 4 : 2}
                      maxLength={field === 'short_description' ? 500 : 5000}
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      aria-invalid={Boolean(fieldErrors[field])}
                      aria-describedby={fieldErrors[field] ? `register-${field}-error` : undefined}
                    />
                  ) : (
                    <input
                      id={`register-${field}`}
                      name={field}
                      type={type}
                      autoComplete={autoComplete}
                      required={
                        required
                        || (field === 'website_url' && !form.location_url.trim())
                        || (field === 'location_url' && !form.website_url.trim())
                      }
                      maxLength={field === 'phone' ? 32 : field === 'governorate' ? 100 : field === 'address' ? 1000 : field === 'website_url' || field === 'location_url' ? 2048 : 255}
                      min={field === 'establishment_year' ? 1800 : undefined}
                      max={field === 'establishment_year' ? new Date().getFullYear() : undefined}
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      aria-invalid={Boolean(fieldErrors[field])}
                      aria-describedby={fieldErrors[field] ? `register-${field}-error` : undefined}
                    />
                  )}
                  {fieldErrors[field] && (
                    <span className="auth-field-error" id={`register-${field}-error`}>
                      {t(fieldErrors[field])}
                    </span>
                  )}
                </label>
              ))}
              <label htmlFor="register-logo">
                {t('Hospital logo/profile image')}
                <input
                  id="register-logo"
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                  aria-invalid={Boolean(fieldErrors.logo)}
                  aria-describedby={fieldErrors.logo ? 'register-logo-error' : 'register-logo-hint'}
                />
                <span id="register-logo-hint" className="profile-field-hint">{t('Upload a JPEG, PNG, or WebP image up to 2 MB.')}</span>
                {fieldErrors.logo && <span className="auth-field-error" id="register-logo-error">{t(fieldErrors.logo)}</span>}
              </label>

              <section className="registration-section" aria-labelledby="registration-account-heading">
                <h2 id="registration-account-heading">{t('Account administrator')}</h2>
                <p>{t('These details create the private hospital administrator sign-in.')}</p>
              </section>
              {[
                ['contact_name', 'Administrator name', 'text', 'name'],
                ['email', 'Administrator sign-in email', 'email', 'email'],
                ['password', 'Password (12 characters minimum)', 'password', 'new-password'],
                ['password_confirmation', 'Confirm password', 'password', 'new-password'],
              ].map(([field, label, type, autoComplete]) => (
                <label key={field} htmlFor={`register-${field}`}>
                  {t(label)}
                  <input
                    id={`register-${field}`}
                    name={field}
                    type={type}
                    autoComplete={autoComplete}
                    required
                    minLength={field === 'password' || field === 'password_confirmation' ? 12 : undefined}
                    maxLength={255}
                    value={form[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    aria-invalid={Boolean(fieldErrors[field])}
                    aria-describedby={fieldErrors[field] ? `register-${field}-error` : undefined}
                  />
                  {fieldErrors[field] && (
                    <span className="auth-field-error" id={`register-${field}-error`}>
                      {t(fieldErrors[field])}
                    </span>
                  )}
                </label>
              ))}

              <button className="login-submit" type="submit" disabled={isSubmitting}>
                {t(isSubmitting ? 'Submitting…' : 'Submit for review')}
              </button>
            </form>
          </>
        )}
      </section>
      <p className="login-footer"><Link to="/login">{t('Authorized staff sign in')}</Link></p>
    </main>
  )
}

export default RegisterHospital
