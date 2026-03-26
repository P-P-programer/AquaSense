export default function WelcomePage({ onLogin }) {
  return (
    <div className="container text-center mt-5">
      <h1>AquaSense</h1>
      <p>Monitoreo inteligente de agua para tu hogar o empresa.</p>
      <div className="mb-4">
        <i className="bi bi-droplet" style={{ fontSize: 48, color: "#0d6efd" }}></i>
        <i className="bi bi-graph-up" style={{ fontSize: 48, color: "#198754", marginLeft: 20 }}></i>
        <i className="bi bi-shield-check" style={{ fontSize: 48, color: "#ffc107", marginLeft: 20 }}></i>
      </div>
      <button className="btn btn-primary" onClick={onLogin}>Entrar</button>
    </div>
  );
}