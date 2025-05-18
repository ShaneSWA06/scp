import exploreBg from "../images/explore.jpg";

function Home() {
  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        height: "92.193vh",
        backgroundImage: `url(${exploreBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        className="text-center px-4 py-5 bg-white bg-opacity-75 rounded shadow"
        style={{ maxWidth: "600px" }}
      >
        <div className="mb-3" style={{ fontSize: "2.5rem" }}>
          🚀
        </div>
        <h1 className="display-5 fw-bold text-primary mb-3">
          Welcome to <span className="text-dark">SoC AR Time Machine</span>
        </h1>
        <p className="lead text-secondary mb-4">
          Step into the past, explore the future — all in Augmented Reality.
        </p>
        <button className="btn btn-outline-primary btn-lg">Explore Now</button>
      </div>
    </div>
  );
}

export default Home;
