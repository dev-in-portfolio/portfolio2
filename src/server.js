const path = require('path');
const express = require('express');
const { helmet, compression } = require('./middleware/security');
const causalityRoutes = require('./apps/causality/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '128kb' }));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.render('index', { page: 'home' });
});

app.get('/history', (req, res) => {
  res.render('history', { page: 'history' });
});

app.get('/chain/:id', (req, res) => {
  res.render('chain', { page: 'chain', chainId: req.params.id });
});

app.use(causalityRoutes);

app.use((req, res) => {
  res.status(404).send('Not found');
});

if (require.main === module) app.listen(PORT, () => {
  console.log(`Causality running on http://localhost:${PORT}`);
});

module.exports = app;
