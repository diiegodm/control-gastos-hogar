type ConfirmButtonProps = {
  label?: string;
  message: string;
  onConfirm: () => void;
};

export default function ConfirmButton({ label = "Eliminar", message, onConfirm }: ConfirmButtonProps) {
  return (
    <button
      className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
      onClick={() => {
        if (window.confirm(message)) onConfirm();
      }}
    >
      {label}
    </button>
  );
}
