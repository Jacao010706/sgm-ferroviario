export default function CCOLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#050505" }}>
      {children}
    </div>
  );
}
