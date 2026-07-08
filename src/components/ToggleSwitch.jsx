 import './ToggleSwitch.css'

export default function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-switch__slider" />
    </label>
  )
}