export default function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <label>
      {label}{' '}
      <select
        value={value}
        onChange={event => {
          const selected = options.find(
            option => option.value === event.target.value,
          )
          if (selected) {
            onChange(selected.value)
          }
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
