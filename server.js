require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compareRoutes = require('./routes/compare');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

app.use('/api', compareRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Content Comparator server running on port ${PORT}`);
});
