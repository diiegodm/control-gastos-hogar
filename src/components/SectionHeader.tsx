type SectionHeaderProps = {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
};

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
