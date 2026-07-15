interface AISummaryCardProps {
  summary: string;
}

export default function AISummaryCard({ summary }: AISummaryCardProps) {
  return (
    <article className="ai-card">
      <h3>AI Summary</h3>
      <p>{summary}</p>
    </article>
  );
}
