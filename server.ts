import express from 'express';
import cors from 'cors';
import routes from './routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors() as any);
app.use(express.json() as any);

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Musicgy Backend running on port ${PORT}`);
});