// components/PublicLayout.js
export default function PublicLayout({ children, background }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundImage: background ? `url(${background})` : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    }}>
      {children}
    </div>
  );
}
