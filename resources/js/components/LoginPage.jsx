export default function LoginPage({ onEnter }) {
  return (
    <div className="container text-center mt-5">
      <h2>Login</h2>
      <button className="btn btn-success" onClick={onEnter}>Entrar</button>
    </div>
  );
}