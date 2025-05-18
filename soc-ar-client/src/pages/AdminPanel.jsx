import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // for redirection

function AdminPanel() {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState([]);
  const [form, setForm] = useState({
    title: "",
    year: "",
    description: "",
    marker_id: "",
    media_url: "",
  });
  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem("token");

  // 🔐 Access control here
  useEffect(() => {
    if (!token) {
      alert("You must be logged in");
      return navigate("/login");
    }

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      if (decoded.role !== "admin") {
        alert("Access denied. Admins only.");
        navigate("/");
      }
    } catch (err) {
      alert("Invalid token. Please log in again.");
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate, token]);

  const fetchMilestones = async () => {
    const res = await axios.get("http://localhost:5000/milestones");
    setMilestones(res.data);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };

    try {
      if (editingId) {
        await axios.put(
          `http://localhost:5000/milestones/${editingId}`,
          form,
          config
        );
      } else {
        await axios.post("http://localhost:5000/milestones", form, config);
      }
      setForm({
        title: "",
        year: "",
        description: "",
        marker_id: "",
        media_url: "",
      });
      setEditingId(null);
      fetchMilestones();
    } catch (err) {
      alert("Unauthorized or error occurred.");
    }
  };

  const handleEdit = (milestone) => {
    setForm(milestone);
    setEditingId(milestone.id);
  };

  const handleDelete = async (id) => {
    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };
    if (window.confirm("Are you sure you want to delete this milestone?")) {
      await axios.delete(`http://localhost:5000/milestones/${id}`, config);
      fetchMilestones();
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="text-primary mb-4">📋 Admin Milestone Manager</h2>

      <form onSubmit={handleSubmit} className="row g-3 mb-5">
        {["title", "year", "description", "marker_id", "media_url"].map(
          (field) => (
            <div className="col-md-6" key={field}>
              <input
                className="form-control"
                placeholder={field.replace("_", " ")}
                name={field}
                value={form[field]}
                onChange={handleChange}
                required
              />
            </div>
          )
        )}
        <div className="col-12">
          <button className="btn btn-primary w-100" type="submit">
            {editingId ? "Update Milestone" : "Add Milestone"}
          </button>
        </div>
      </form>

      <table className="table table-bordered table-striped">
        <thead>
          <tr>
            <th>Title</th>
            <th>Year</th>
            <th>Marker ID</th>
            <th>Description</th>
            <th>Media URL</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map((m) => (
            <tr key={m.id}>
              <td>{m.title}</td>
              <td>{m.year}</td>
              <td>{m.marker_id}</td>
              <td>{m.description}</td>
              <td>{m.media_url}</td>
              <td>
                <button
                  className="btn btn-warning btn-sm me-2"
                  onClick={() => handleEdit(m)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(m.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPanel;
