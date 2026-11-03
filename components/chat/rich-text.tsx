// plain text only, never rendered as HTML
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </>
  );
}
