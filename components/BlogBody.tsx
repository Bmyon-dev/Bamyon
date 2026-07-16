"use client";

export default function BlogBody({ text }: { text: string }) {
  const parts = text.split(/(!\[\]\([^)]+\))/g);

  return (
    <div className="prose max-w-none mt-6 text-black/80">
      {parts.map((part, i) => {
        const match = part.match(/^!\[\]\(([^)]+)\)$/);
        if (match) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={match[1]} alt="" className="w-full rounded-2xl my-4" />
          );
        }
        return part.trim() ? (
          <p key={i} className="whitespace-pre-line mb-4">{part.trim()}</p>
        ) : null;
      })}
    </div>
  );
}
