const express = require('express');
const guestController = require('../controllers/guest.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', guestController.create);
router.get('/party/:partyId', guestController.getByParty);
router.get('/:id', guestController.getById);
router.put('/:id', guestController.update);
router.patch('/:id/status', guestController.updateStatus);
router.delete('/:id', guestController.delete);
router.post('/bulk-delete', guestController.bulkDelete);

module.exports = router;
