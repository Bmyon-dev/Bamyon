export default function Logo({ size = "text-2xl" }: { size?: string }) {
  return (
    <span className={`font-display font-extrabold ${size}`}>
      <span className="text-bamyon-green">BAM</span>
      <span className="text-bamyon-amber">YON</span>
    </span>
  );
}
