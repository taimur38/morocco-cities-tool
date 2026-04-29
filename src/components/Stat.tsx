type Props = {
  label: string;
  value: string;
  delta?: string;
};

export default function Stat({ label, value, delta }: Props) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {delta ? <div className="delta">{delta}</div> : null}
    </div>
  );
}
