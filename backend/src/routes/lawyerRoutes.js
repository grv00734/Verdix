const express = require('express');
const router = express.Router();
const {
  registerLawyer,
  updateLawyerProfile,
  getLawyerProfile,
  searchLawyers,
  getAllLawyers,
  verifyLawyer
} = require('../controllers/lawyerController');
const { authMiddleware, requireLawyer } = require('../middleware/auth');

router.post('/register', authMiddleware, requireLawyer, registerLawyer);
router.put('/profile', authMiddleware, requireLawyer, updateLawyerProfile);
// Static paths must be registered before the `/:lawyerId` param route,
// otherwise "/search" and "/" get captured as a lawyerId.
router.get('/search', searchLawyers);
router.get('/', getAllLawyers);
router.get('/:lawyerId', getLawyerProfile);
router.put('/:lawyerId/verify', verifyLawyer); // Admin only

module.exports = router;
