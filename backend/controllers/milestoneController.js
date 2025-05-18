exports.updateMilestone = async (req, res) => {
  const { id } = req.params;
  const { title, year, description, media_url, marker_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE milestones SET title=$1, year=$2, description=$3, media_url=$4, marker_id=$5 WHERE id=$6 RETURNING *`,
      [title, year, description, media_url, marker_id, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMilestone = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`DELETE FROM milestones WHERE id=$1`, [id]);
    res.json({ message: "Milestone deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
