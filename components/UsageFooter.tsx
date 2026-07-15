interface UsageFooterProps {
  usageText: string;
  cacheNote: string;
}

export default function UsageFooter({ usageText, cacheNote }: UsageFooterProps) {
  return (
    <footer className="app-footer">
      <span>{usageText}</span>
      <span className="cache-note">{cacheNote}</span>
    </footer>
  );
}
