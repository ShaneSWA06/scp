const authenticateToken = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

router.post(
  "/",
  authenticateToken,
  isAdmin,
  milestoneController.createMilestone
);
router.put(
  "/:id",
  authenticateToken,
  isAdmin,
  milestoneController.updateMilestone
);
router.delete(
  "/:id",
  authenticateToken,
  isAdmin,
  milestoneController.deleteMilestone
);
