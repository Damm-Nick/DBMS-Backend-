const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Venues route working', data: [] });
});

module.exports = router;
